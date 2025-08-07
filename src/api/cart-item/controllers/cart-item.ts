/**
 * cart-item controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::cart-item.cart-item" as any,
  ({ strapi }) => ({
    async addProductToCart(ctx: any) {
      try {
        const firebaseUid = ctx.state.user.uid;
        const data = ctx.request.body;
        const result = await strapi
          .service("api::cart-item.cart-item" as any)
          .addProductToCart(firebaseUid, data);
        ctx.set("Cache-Control", "no-store"); // Asegurar que la respuesta no se cachee
        return ctx.created(result);
      } catch (error: any) {
        strapi.log.error("Error adding product to cart:", error);
        return ctx.badRequest(error.message);
      }
    },

    async removeProductFromCart(ctx: any) {
      try {
        const firebaseUid = ctx.state.user.uid;
        const { productId, size, color } = ctx.request.body;
        const result = await strapi
          .service("api::cart-item.cart-item" as any)
          .removeProductFromCart(firebaseUid, productId, size, color);
        return ctx.send(result);
      } catch (error: any) {
        strapi.log.error("Error removing product from cart:", error);
        return ctx.badRequest(error.message);
      }
    },

    async updateProductQuantity(ctx: any) {
      try {
        const firebaseUid = ctx.state.user.uid;
        const { productId, size, quantity, color } = ctx.request.body;
        const result = await strapi
          .service("api::cart-item.cart-item" as any)
          .updateProductQuantity(firebaseUid, productId, size, quantity, color);
        ctx.set("Cache-Control", "no-store"); // Asegurar que la respuesta no se cachee
        return ctx.send(result);
      } catch (error: any) {
        strapi.log.error("Error updating product quantity in cart:", error);
        return ctx.badRequest(error.message);
      }
    },

    async getUserCart(ctx: any) {
      try {
        const firebaseUid = ctx.state.user.uid;
        const cartItems = await strapi
          .service("api::cart-item.cart-item" as any)
          .getUserCart(firebaseUid);
        ctx.set("Cache-Control", "no-store"); // Asegurar que la respuesta no se cachee
        return ctx.send(cartItems);
      } catch (error: any) {
        strapi.log.error("Error getting user cart:", error);
        return ctx.badRequest(error.message);
      }
    },

    async clearCart(ctx: any) {
      try {
        const firebaseUid = ctx.state.user.uid;
        const result = await strapi
          .service("api::cart-item.cart-item" as any)
          .clearCart(firebaseUid);
        return ctx.send(result);
      } catch (error: any) {
        strapi.log.error("Error clearing cart:", error);
        return ctx.badRequest(error.message);
      }
    },
  })
);
