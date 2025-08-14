import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecret || !endpointSecret) {
  throw new Error("Stripe secret key or webhook secret is not configured.");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-07-30.basil",
});

export default {
  async handleStripeWebhook(ctx: any) {
    const event = ctx.request.body;

    ctx.send({ received: true }, 200);

    if (!event || !event.type) {
      return;
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;

        try {
          const fullSession = await stripe.checkout.sessions.retrieve(
            session.id,
            {
              expand: ["line_items"],
            }
          );

          const lineItems = fullSession.line_items?.data;
          const firebaseUid = fullSession.metadata?.firebaseUid;
          const promotionCodeUsed = fullSession.metadata?.promotionCode;
          const itemsMetaRaw = (fullSession.metadata as any)?.items;
          let itemsMeta: Array<{
            productId: number;
            quantity: number;
            unitPrice: number;
            size?: string;
            color?: string;
          }> = [];
          if (itemsMetaRaw) {
            try {
              itemsMeta = JSON.parse(itemsMetaRaw);
            } catch (_) {
              itemsMeta = [];
            }
          }

          if (!firebaseUid) {
            return;
          }

          const strapiUsers = await strapi.entityService.findMany(
            "api::auth.auth" as any,
            {
              filters: { uid: firebaseUid },
            }
          );

          if (!strapiUsers || strapiUsers.length === 0) {
            return;
          }

          const strapiUser = strapiUsers[0];
          const userId = strapiUser.id;

          const shippingDetails = (session as any).collected_information
            ?.shipping_details || {
            address: (session as any).customer_details?.address,
            name: (session as any).customer_details?.name,
          };

          let orderItems: any[] = [];
          if (itemsMeta.length > 0) {
            orderItems = itemsMeta.map((it) => ({
              product: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              size: it.size || "",
              color: it.color || "",
            }));
          } else {
            orderItems = lineItems?.map((item: any) => ({
              quantity: item.quantity,
              unitPrice: item.price.unit_amount / 100,
              size: item.price.product?.metadata?.size || "",
              color: item.price.product?.metadata?.color || "",
            })) as any[];
          }

          const shippingAddress = shippingDetails?.address || null;
          const shippingName = shippingDetails?.name || null;

          const newOrder = await strapi.entityService.create(
            "api::order.order" as any,
            {
              data: {
                user: userId,
                address: null,
                totalAmount: session.amount_total! / 100,
                currency: session.currency,
                stripeSessionId: session.id,
                orderItems: orderItems,
                orderStatus: "paid",
                promotionCode: promotionCodeUsed,
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
                shippingAddressText: [
                  shippingName || null,
                  [shippingAddress?.line1, shippingAddress?.line2]
                    .filter(Boolean)
                    .join(", "),
                  [
                    shippingAddress?.city,
                    shippingAddress?.state,
                    shippingAddress?.postal_code,
                  ]
                    .filter(Boolean)
                    .join(", "),
                  shippingAddress?.country || null,
                ]
                  .filter((p) => p && String(p).trim().length > 0)
                  .join(" · "),
              } as any,
            }
          );

          const customerEmail = (session as any).customer_details?.email;
          const customerPhone = (session as any).customer_details?.phone;
          const updates: any = {};
          if (customerEmail) updates.email = customerEmail;
          if (customerPhone) updates.phone = customerPhone;
          if (Object.keys(updates).length > 0) {
            try {
              await strapi.entityService.update(
                "api::auth.auth" as any,
                userId,
                { data: updates }
              );
            } catch (e) {
              strapi.log.warn(
                `Could not update user contact from Stripe: ${e.message}`
              );
            }
          }

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
            }
          }

          // Sync membership for subscription checkouts
          if (fullSession.mode === "subscription" && fullSession.subscription) {
            try {
              const subscription: any = await stripe.subscriptions.retrieve(
                fullSession.subscription as string
              );
              const stripeCustomerId =
                typeof subscription.customer === "string"
                  ? subscription.customer
                  : subscription.customer?.id;
              const periodEndSeconds = subscription.current_period_end;
              const expiresAtIso =
                typeof periodEndSeconds === "number"
                  ? new Date(periodEndSeconds * 1000).toISOString()
                  : null;

              const tier = fullSession.metadata?.membershipTier || "gold";

              const existingMemberships = await strapi.entityService.findMany(
                "api::membership.membership" as any,
                { filters: { user: userId } }
              );

              const membershipData: any = {
                user: userId,
                tier,
                isActive: true,
                discountPercent: 25,
                freeShipping: true,
                stripeCustomerId,
                stripeSubscriptionId: fullSession.subscription as string,
                startedAt: new Date().toISOString(),
                expiresAt: expiresAtIso,
              };

              if (existingMemberships && existingMemberships.length > 0) {
                await strapi.entityService.update(
                  "api::membership.membership" as any,
                  existingMemberships[0].id,
                  { data: membershipData }
                );
              } else {
                await strapi.entityService.create(
                  "api::membership.membership" as any,
                  { data: membershipData }
                );
              }
            } catch (membershipErr: any) {
              strapi.log.warn(
                `Could not sync membership from checkout.session.completed: ${membershipErr.message}`
              );
            }
          }
        } catch (processError: any) {}
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        try {
          const sub: any = event.data.object;
          if (!sub?.id) break;
          const stripeSubscriptionId = sub.id;
          const stripeCustomerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          const isActive = sub.status === "active" || sub.status === "trialing";
          const expiresAtIso =
            typeof sub.current_period_end === "number"
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null;

          const memberships = await strapi.entityService.findMany(
            "api::membership.membership" as any,
            { filters: { stripeSubscriptionId } }
          );
          if (memberships && memberships.length > 0) {
            await strapi.entityService.update(
              "api::membership.membership" as any,
              memberships[0].id,
              {
                data: {
                  isActive,
                  stripeCustomerId,
                  expiresAt: expiresAtIso,
                } as any,
              }
            );
          }
        } catch (subErr: any) {
          strapi.log.warn(
            `Could not update membership from subscription event: ${subErr.message}`
          );
        }
        break;
      }
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        break;
      default:
        break;
    }
  },
};
