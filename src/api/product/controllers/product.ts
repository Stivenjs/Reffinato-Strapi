/**
 * product controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::product.product" as any,
  ({ strapi }) => ({
    async getProductsByCategory(ctx) {
      const { category } = ctx.query;

      try {
        const products = await strapi
          .service("api::product.product" as any)
          .getProductsByCategory(category);
        if (products.length > 0) {
          ctx.send(products, 200);
        } else {
          ctx.notFound("No products found in this category");
        }
      } catch (error) {
        console.error("Error fetching products by category:", error);
        ctx.internalServerError("Internal server error", {
          error: error.message,
        });
      }
    },

    async getProductById(ctx) {
      const { id } = ctx.params;

      try {
        const product = await strapi
          .service("api::product.product" as any)
          .getProductById(id);
        if (product) {
          ctx.send(product, 200);
        } else {
          ctx.notFound("Product not found");
        }
      } catch (error) {
        console.error("Error fetching product by ID:", error);
        ctx.internalServerError("Internal server error", {
          error: error.message,
        });
      }
    },

    async getProductList(ctx) {
      try {
        const products = await strapi
          .service("api::product.product" as any)
          .getProductList();
        if (products.length > 0) {
          ctx.send(products, 200);
        } else {
          ctx.notFound("No products found");
        }
      } catch (error) {
        console.error("Error fetching product list:", error);
        ctx.internalServerError("Internal server error", {
          error: error.message,
        });
      }
    },
  })
);
