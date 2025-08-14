/**
 * membership controller
 */

import { factories } from "@strapi/strapi";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("Stripe secret key is not configured.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-07-30.basil",
});

export default factories.createCoreController(
  "api::membership.membership" as any,
  ({ strapi }) => ({
    async syncFromStripe(ctx) {
      try {
        const event = ctx.request.body;
        if (!event || !event.type) {
          return ctx.badRequest("Invalid Stripe event payload");
        }

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data?.object;
            if (session?.mode !== "subscription") break;

            const firebaseUid = session?.metadata?.firebaseUid;
            if (!firebaseUid) break;

            const users = await strapi.entityService.findMany(
              "api::auth.auth" as any,
              { filters: { uid: firebaseUid } }
            );
            if (!users || users.length === 0) break;
            const userId = users[0].id;

            const subscriptionId = session.subscription as string | undefined;
            let stripeCustomerId: string | null = null;
            let expiresAtIso: string | null = null;
            try {
              if (subscriptionId) {
                const subscriptionAny: any =
                  await stripe.subscriptions.retrieve(subscriptionId, {
                    expand: ["latest_invoice"],
                  });
                stripeCustomerId =
                  typeof subscriptionAny.customer === "string"
                    ? subscriptionAny.customer
                    : subscriptionAny.customer?.id;
                if (typeof subscriptionAny.current_period_end === "number") {
                  strapi.log.debug(
                    `Stripe sub ${subscriptionId} current_period_end=${subscriptionAny.current_period_end}`
                  );
                  expiresAtIso = new Date(
                    subscriptionAny.current_period_end * 1000
                  ).toISOString();
                }
                // Fallback: intentar con la última factura
                if (!expiresAtIso && subscriptionAny.latest_invoice) {
                  const latestInvoiceId =
                    typeof subscriptionAny.latest_invoice === "string"
                      ? subscriptionAny.latest_invoice
                      : subscriptionAny.latest_invoice.id;
                  try {
                    const invoiceAny: any = await stripe.invoices.retrieve(
                      latestInvoiceId,
                      { expand: ["lines"] }
                    );
                    const firstLine = invoiceAny.lines?.data?.[0];
                    const periodEndSeconds = firstLine?.period?.end;
                    if (typeof periodEndSeconds === "number") {
                      strapi.log.debug(
                        `Invoice ${latestInvoiceId} period.end=${periodEndSeconds}`
                      );
                      expiresAtIso = new Date(
                        periodEndSeconds * 1000
                      ).toISOString();
                    }
                  } catch (_) {}
                }
              }
            } catch (e) {
              strapi.log.warn(
                `Error syncing membership from Stripe: ${e.message}`
              );
            }

            const existing = await strapi.entityService.findMany(
              "api::membership.membership" as any,
              { filters: { user: userId } }
            );

            const data: any = {
              user: userId,
              tier: "gold",
              isActive: true,
              discountPercent: 25,
              freeShipping: true,
              stripeCustomerId: stripeCustomerId,
              stripeSubscriptionId: subscriptionId || null,
              startedAt: new Date().toISOString(),
              expiresAt: expiresAtIso,
            };

            if (existing && existing.length > 0) {
              await strapi.entityService.update(
                "api::membership.membership" as any,
                existing[0].id,
                { data }
              );
            } else {
              await strapi.entityService.create(
                "api::membership.membership" as any,
                { data }
              );
            }
            break;
          }

          case "customer.subscription.created":
          case "customer.subscription.updated":
          case "customer.subscription.deleted": {
            const sub = event.data?.object;
            if (!sub?.id) break;
            const stripeSubscriptionId = sub.id;
            const stripeCustomerId =
              typeof sub.customer === "string"
                ? sub.customer
                : sub.customer?.id;
            const isActive =
              sub.status === "active" || sub.status === "trialing";
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
            break;
          }

          default:
            break;
        }

        return ctx.send({ ok: true });
      } catch (err: any) {
        return ctx.internalServerError("Membership sync failed", {
          error: err.message,
        });
      }
    },

    async me(ctx) {
      const firebaseUid = ctx.state.user?.uid;
      if (!firebaseUid) return ctx.unauthorized("Missing Firebase UID");

      const users = await strapi.entityService.findMany(
        "api::auth.auth" as any,
        { filters: { uid: firebaseUid } }
      );
      if (!users || users.length === 0) return ctx.notFound("User not found");
      const userId = users[0].id;

      const memberships = await strapi.entityService.findMany(
        "api::membership.membership" as any,
        { filters: { user: userId }, populate: [] }
      );

      return ctx.send({
        data: memberships && memberships[0] ? memberships[0] : null,
      });
    },
  })
);
