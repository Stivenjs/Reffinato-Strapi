import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("Stripe secret key is not configured.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-07-30.basil",
});

export default {
  async createCheckoutSession(ctx: any) {
    const { cartItems, successUrl, cancelUrl, promotionCode } =
      ctx.request.body;
    const firebaseUid = ctx.state.user?.uid;

    if (!firebaseUid) {
      return ctx.unauthorized("Authentication required: missing Firebase UID.");
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return ctx.badRequest(
        "Cart items array is required and must not be empty."
      );
    }
    if (!successUrl || !cancelUrl) {
      return ctx.badRequest("successUrl and cancelUrl are required.");
    }

    let promotionDiscountPercentage = 0;
    let currentPromotionCodeId: string | null = null; // Para almacenar el ID del código de promoción de Strapi

    try {
      const line_items = cartItems.map((item: any) => {
        // Asegurarse de que el producto y sus precios existan
        if (!item.product || typeof item.quantity !== "number") {
          throw new Error("Invalid product data in cart items.");
        }

        // Asumimos que `item.product.price` ya incluye el descuento de temporada si aplica
        let unitPrice = item.product.price;

        // Si hay un `discountPrice` (descuento de administrador) y es menor que el precio actual
        if (
          item.product.discountPrice !== null &&
          item.product.discountPrice < unitPrice
        ) {
          unitPrice = item.product.discountPrice;
        }

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.product.name,
              images:
                item.product.photos && item.product.photos.length > 0
                  ? [item.product.photos[0].url]
                  : [],
              metadata: {
                productId: item.product.id,
                size: item.size || "",
                color: item.color || "",
              },
            },
            unit_amount: Math.round(unitPrice * 100),
          },
          quantity: item.quantity,
        };
      });

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        line_items: line_items,
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        phone_number_collection: { enabled: true },
        shipping_address_collection: {
          allowed_countries: [
            "US",
            "CA",
            "MX",
            "CO",
            "AR",
            "BR",
            "CL",
            "PE",
            "EC",
            "VE",
          ], // Países permitidos
        },

        // Metadata para almacenar información adicional
        metadata: {
          firebaseUid: firebaseUid || "guest",
          promotionCode: promotionCode || "none",
        },

        // customer_email: ctx.state.user?.email, // Opcional: email del cliente si disponible
      };

      // Lógica para validar el código de promoción (si se proporciona)
      if (promotionCode) {
        // Buscar el código de promoción en Strapi
        const promoCodes = await strapi.entityService.findMany(
          "api::promotion-code.promotion-code" as any,
          {
            filters: { code: promotionCode },
            populate: ["users"], // Para verificar si el usuario ya lo usó
          }
        );

        if (promoCodes && promoCodes.length > 0) {
          const promo = promoCodes[0];
          const now = new Date();

          // Validaciones del código de promoción
          if (!promo.isActive) {
            throw new Error("Promotion code is not active.");
          }
          if (promo.validFrom && new Date(promo.validFrom) > now) {
            throw new Error("Promotion code is not yet valid.");
          }
          if (promo.validUntil && new Date(promo.validUntil) < now) {
            throw new Error("Promotion code has expired.");
          }

          // No marcar ni rechazar aquí por uso previo; el marcado se hará en el webhook al completar el pago
          currentPromotionCodeId = promo.id;

          promotionDiscountPercentage = promo.discountPercentage;
        }
      }

      if (promotionDiscountPercentage > 0) {
        let couponId: string | undefined;
        try {
          // Intenta buscar un cupón pre-existente por su porcentaje
          const coupons = await stripe.coupons.list({ limit: 100 }); // Considera buscar por metadata o ID específico en un entorno real
          const existingCoupon = coupons.data.find(
            (c) =>
              c.percent_off === promotionDiscountPercentage &&
              c.duration === "once"
          );

          if (existingCoupon) {
            couponId = existingCoupon.id;
          } else {
            // Si no existe, crea un nuevo cupón dinámicamente
            const newCoupon = await stripe.coupons.create({
              percent_off: promotionDiscountPercentage,
              duration: "once", // 'once', 'repeating', 'forever'
              name: `Discount ${promotionDiscountPercentage}% ${promotionCode ? `- ${promotionCode}` : ""}`,
              metadata: { strapiPromotionCode: promotionCode || "none" }, // Guarda el código de promoción para referencia
            });
            couponId = newCoupon.id;
          }
        } catch (couponError: any) {
          strapi.log.error(
            `Error creating/finding Stripe coupon: ${couponError.message}`
          );
          // Si hay un error con el cupón, no apliques el descuento pero permite que la sesión continúe.
        }

        if (couponId) {
          sessionConfig.discounts = [{ coupon: couponId }];
        }
      }

      // Adjuntar metadata compacta de los items para reconstruir la orden en el webhook
      try {
        const itemsMeta = cartItems.map((item: any) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice:
            item.product.discountPrice !== null &&
            item.product.discountPrice < item.product.price
              ? item.product.discountPrice
              : item.product.price,
          size: item.size || "",
          color: item.color || "",
        }));
        // Stripe metadata valores son strings
        (sessionConfig.metadata as any).items = JSON.stringify(itemsMeta);
      } catch (metaErr) {
        strapi.log.warn(
          `Could not serialize items metadata for Checkout Session: ${metaErr.message}`
        );
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      // Si el Payment Intent se crea con éxito y se usó un código de promoción,
      // almacenarlo temporalmente en el metadata de la sesión de Stripe.
      // Esto es CRUCIAL para que el Webhook pueda actualizar el `currentUses` o la relación `users`.
      // No actualices el uso aquí, solo cuando el `checkout.session.completed` sea recibido por el Webhook.
      // Si necesitas asociar esto a un pedido, también puedes usar metadata aquí.

      return ctx.send({
        id: session.id,
        url: session.url,
      });
    } catch (error: any) {
      strapi.log.error(
        `Error creating Stripe Checkout Session: ${error.message}`
      );
      return ctx.internalServerError(
        "An error occurred while creating the checkout session.",
        { error: error.message }
      );
    }
  },

  async createSubscriptionSession(ctx: any) {
    const { successUrl, cancelUrl, priceId } = ctx.request.body;
    const firebaseUid = ctx.state.user?.uid;

    if (!successUrl || !cancelUrl) {
      return ctx.badRequest("successUrl and cancelUrl are required.");
    }

    const defaultPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
    const finalPriceId = priceId || defaultPriceId;
    if (!finalPriceId) {
      return ctx.badRequest(
        "Missing priceId. Define STRIPE_SUBSCRIPTION_PRICE_ID or send priceId in body."
      );
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [
          {
            price: finalPriceId,
            quantity: 1,
          },
        ],
        metadata: {
          firebaseUid: firebaseUid || "guest",
          membershipTier: "gold",
        },
        allow_promotion_codes: false,
      });

      return ctx.send({ id: session.id, url: session.url });
    } catch (error: any) {
      strapi.log.error(
        `Error creating Stripe Subscription Session: ${error.message}`
      );
      return ctx.internalServerError("Could not create subscription session.");
    }
  },

  async createCustomerPortalSession(ctx: any) {
    try {
      const { returnUrl } = ctx.request.body || {};
      const firebaseUid = ctx.state.user?.uid;
      if (!firebaseUid) {
        return ctx.unauthorized(
          "Authentication required: missing Firebase UID."
        );
      }

      // Buscar membership del usuario para obtener el customerId de Stripe
      const users = await strapi.entityService.findMany(
        "api::auth.auth" as any,
        { filters: { uid: firebaseUid } }
      );
      if (!users || users.length === 0) {
        return ctx.notFound("User not found");
      }
      const userId = users[0].id;

      const memberships = await strapi.entityService.findMany(
        "api::membership.membership" as any,
        { filters: { user: userId } }
      );
      if (!memberships || memberships.length === 0) {
        return ctx.badRequest("No membership found for user");
      }

      const stripeCustomerId = memberships[0].stripeCustomerId;
      if (!stripeCustomerId) {
        return ctx.badRequest("Missing Stripe customer id in membership");
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl || `${ctx.request.origin || ""}`,
      });

      return ctx.send({ url: portalSession.url });
    } catch (err: any) {
      strapi.log.error(`Error creating portal session: ${err.message}`);
      return ctx.internalServerError("Could not create portal session");
    }
  },
};
