import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::order.order" as any,
  ({ strapi }) => ({
    async findMe(ctx) {
      const firebaseUid = ctx.state.user?.uid;
      if (!firebaseUid) {
        return ctx.unauthorized("Authentication required");
      }

      const users = await strapi.entityService.findMany(
        "api::auth.auth" as any,
        {
          filters: { uid: firebaseUid },
        }
      );

      if (!users || users.length === 0) {
        return ctx.notFound("User not found");
      }

      const userId = users[0].id;
      const orders = await strapi.entityService.findMany(
        "api::order.order" as any,
        {
          filters: { user: userId },
          populate: [
            "address",
            "orderItems",
            "orderItems.product",
            "orderItems.product.photos",
          ],
          sort: { id: "desc" },
        }
      );

      const withProductInfo = orders.map((o: any) => ({
        ...o,
        orderItems: (o.orderItems || []).map((it: any) => ({
          id: it.id,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          size: it.size,
          color: it.color,
          productName: it.product?.name || null,
          productPhotoUrl: it.product?.photos?.[0]?.url || null,
        })),
      }));

      return ctx.send(withProductInfo);
    },
  })
);
