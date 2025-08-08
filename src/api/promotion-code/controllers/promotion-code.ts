import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::promotion-code.promotion-code" as any,
  ({ strapi }) => ({
    async applyPromotionCode(ctx) {
      const { code } = ctx.request.body;
      const firebaseUid = ctx.state.user.uid;

      if (!code) {
        return ctx.badRequest("Promotion code is required");
      }
      if (!firebaseUid) {
        return ctx.unauthorized("User not authenticated");
      }

      try {
        const strapiUser = await strapi.entityService.findMany(
          "api::auth.auth" as any,
          {
            filters: { uid: firebaseUid },
          }
        );

        if (!strapiUser || strapiUser.length === 0) {
          return ctx.notFound(
            "Strapi user not found for the given Firebase UID."
          );
        }
        const userId = strapiUser[0].id;

        const promotionCode = await strapi.entityService.findMany(
          "api::promotion-code.promotion-code" as any,
          {
            filters: { code: code },
            populate: ["users"],
          }
        );

        if (!promotionCode || promotionCode.length === 0) {
          return ctx.notFound("Promotion code not found");
        }

        const promo = promotionCode[0];
        const now = new Date();

        if (!promo.isActive) {
          return ctx.badRequest("Promotion code is not active");
        }

        if (promo.validFrom && new Date(promo.validFrom) > now) {
          return ctx.badRequest("Promotion code is not yet valid");
        }
        if (promo.validUntil && new Date(promo.validUntil) < now) {
          return ctx.badRequest("Promotion code has expired");
        }

        const hasUserUsedCode = promo.users.some(
          (user: any) => user.id === userId
        );
        if (hasUserUsedCode) {
          return ctx.badRequest(
            "Promotion code has already been used by this user"
          );
        }
        return ctx.send({
          message: "Promotion code validated",
          discountPercentage: promo.discountPercentage,
        });
      } catch (error) {
        strapi.log.error(`Error applying promotion code: ${error.message}`);
        return ctx.internalServerError(
          "An error occurred while applying the promotion code"
        );
      }
    },
  })
);
