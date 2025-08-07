import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecret || !endpointSecret) {
  throw new Error("Stripe secret key or webhook secret is not configured.");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-06-30.basil",
});

export default {
  async handleStripeWebhook(ctx: any) {
    // NO se necesita verificar la firma aquí, la Lambda ya lo hizo.
    // El cuerpo de la solicitud ya debe ser un objeto JSON parseado por el middleware de Strapi.
    const event = ctx.request.body; // El evento de Stripe ya viene parseado de la Lambda

    // ¡Enviar la respuesta 200 OK inmediatamente a Stripe para evitar timeouts!
    // Esta respuesta es para la Lambda, no para Stripe directamente.
    ctx.send({ received: true }, 200);

    if (!event || !event.type) {
      console.log(
        `[StripeWebhookController] Evento recibido es inválido o no tiene tipo.`
      );
      return; // Salir si el evento no es válido
    }

    // Procesar el evento de forma asíncrona después de enviar la respuesta a la Lambda
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;

        console.log(`Checkout session completed: ${session.id}`);

        try {
          // Recuperar la sesión completa con line_items y metadata
          const fullSession = await stripe.checkout.sessions.retrieve(
            session.id,
            {
              expand: ["line_items"],
            }
          );

          const lineItems = fullSession.line_items?.data;
          const firebaseUid = fullSession.metadata?.firebaseUid; // Recuperar UID del metadata
          const promotionCodeUsed = fullSession.metadata?.promotionCode; // Recuperar promotionCode del metadata

          if (!firebaseUid) {
            console.log(
              `Checkout session ${session.id} completed, but no firebaseUid found in metadata.`
            );
            return; // Salir si falta información crítica
          }

          // 1. Buscar el usuario en Strapi
          const strapiUsers = await strapi.entityService.findMany(
            "api::auth.auth" as any,
            {
              filters: { uid: firebaseUid },
            }
          );

          if (!strapiUsers || strapiUsers.length === 0) {
            console.log(
              `User with firebaseUid ${firebaseUid} not found in Strapi.`
            );
            return; // Salir si el usuario no se encuentra
          }

          const strapiUser = strapiUsers[0];
          const userId = strapiUser.id;

          // 2. Buscar la dirección registrada del usuario (asumiendo un Content Type 'address' relacionado con 'auth')
          const userAddresses = await strapi.entityService.findMany(
            "api::address.address" as any, // Reemplaza con el nombre de tu Content Type de direcciones
            {
              filters: { user: userId },
            }
          );

          if (!userAddresses || userAddresses.length === 0) {
            console.log(
              `No address found for user ${userId}. Order cannot be created.`
            );
            return; // Salir si no hay dirección
          }

          const userAddress = userAddresses[0]; // Tomar la primera dirección encontrada

          // 3. Crear el pedido en Strapi
          const orderItems = lineItems?.map((item: any) => ({
            productName: item.description,
            quantity: item.quantity,
            price: item.price.unit_amount / 100,
          }));

          // Obtener información de envío de la sesión de Stripe
          const shippingAddress =
            "shipping" in session ? (session as any).shipping?.address : null;
          const shippingName =
            "shipping" in session ? (session as any).shipping?.name : null;

          const newOrder = await strapi.entityService.create(
            "api::order.order" as any, // Reemplaza con el nombre de tu Content Type de pedidos
            {
              data: {
                user: userId,
                address: userAddress.id,
                totalAmount: session.amount_total! / 100,
                currency: session.currency,
                stripeSessionId: session.id,
                orderItems: orderItems,
                status: "completed",
                promotionCode: promotionCodeUsed,
                // Información de envío de Stripe
                shippingAddress: shippingAddress
                  ? {
                      line1: shippingAddress.line1,
                      line2: shippingAddress.line2,
                      city: shippingAddress.city,
                      state: shippingAddress.state,
                      postalCode: shippingAddress.postal_code,
                      country: shippingAddress.country,
                    }
                  : null,
                shippingName: shippingName || null,
              } as any,
            }
          );

          console.log(
            `Order ${newOrder.id} created successfully for user ${userId}.`
          );

          // 4. Marcar el código de promoción como usado (si se usó)
          if (promotionCodeUsed) {
            const promoCodesToUpdate = await strapi.entityService.findMany(
              "api::promotion-code.promotion-code" as any,
              {
                filters: { code: promotionCodeUsed },
              }
            );

            if (promoCodesToUpdate && promoCodesToUpdate.length > 0) {
              const promoToUpdate = promoCodesToUpdate[0];
              const usersAlreadyUsed = promoToUpdate.users || [];

              await strapi.entityService.update(
                "api::promotion-code.promotion-code" as any,
                promoToUpdate.id,
                {
                  data: {
                    users: [...usersAlreadyUsed.map((u: any) => u.id), userId],
                    currentUses: (promoToUpdate.currentUses || 0) + 1,
                  } as any,
                }
              );
              console.log(
                `Promotion code ${promotionCodeUsed} marked as used by user ${userId}.`
              );
            }
          }
        } catch (processError: any) {
          console.log(
            `Error processing checkout.session.completed for session ${session.id}: ${processError.message}`
          );
          // En un entorno de producción, podrías querer reintentar el procesamiento o alertar a un administrador.
        }
        break;
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent was successful! ${paymentIntent.id}`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  },
};
