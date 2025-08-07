/**
 * category controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::category.category" as any,
  ({ strapi }) => ({
    // Sobrescribir el método find para obtener todas las categorías con productos populados y descuentos aplicados
    async find(ctx) {
      try {
        const categories = await strapi.entityService.findMany(
          "api::category.category" as any,
          {
            populate: {
              image: { fields: ["id", "url"] }, // Solo traer id y url de las imágenes
              products: {
                populate: {
                  photos: { fields: ["id", "url"] }, // Solo traer id y url de las fotos
                  colors: true,
                  sizes: true,
                },
              },
            },
          }
        );

        const processedData = await Promise.all(
          categories.map(async (category: any) => {
            if (category.products && category.products.length > 0) {
              category.products = await Promise.all(
                category.products.map((product: any) =>
                  strapi
                    .service("api::product.product")
                    .applySeasonalDiscount(product)
                )
              );
            }
            return category;
          })
        );

        return { data: processedData };
      } catch (err) {
        ctx.badRequest("Error fetching categories", { error: err });
      }
    },

    // Sobrescribir el método findOne para obtener una categoría específica con productos populados y descuentos aplicados
    async findOne(ctx) {
      const { id } = ctx.params;
      try {
        const category = await strapi.entityService.findOne(
          "api::category.category" as any,
          id,
          {
            populate: {
              image: { fields: ["id", "url"] }, // Solo traer id y url de las imágenes
              products: {
                populate: {
                  photos: { fields: ["id", "url"] }, // Solo traer id y url de las fotos
                  colors: true,
                  sizes: true,
                },
              },
            },
          }
        );

        if (!category) {
          return ctx.notFound("Category not found");
        }

        if (category.products && category.products.length > 0) {
          category.products = await Promise.all(
            category.products.map((product: any) =>
              strapi
                .service("api::product.product")
                .applySeasonalDiscount(product)
            )
          );
        }

        return { data: category };
      } catch (err) {
        ctx.badRequest("Error fetching category", { error: err });
      }
    },

    async findProductsByCategory(ctx) {
      const { id } = ctx.params;

      try {
        const category = await strapi.entityService.findOne(
          "api::category.category" as any,
          id,
          {
            populate: {
              image: { fields: ["id", "url"] }, // Solo traer id y url de las imágenes
              products: {
                populate: {
                  photos: { fields: ["id", "url"] }, // Solo traer id y url de las fotos
                  colors: true,
                  sizes: true,
                },
              },
            },
          }
        );

        if (!category) {
          return ctx.notFound("Category not found");
        }

        // Procesar los productos y aplicar el descuento
        const processedProducts = await Promise.all(
          category.products.map((product: any) =>
            strapi
              .service("api::product.product")
              .applySeasonalDiscount(product)
          )
        );

        // Devolver la categoría con los productos procesados
        ctx.body = { data: { ...category, products: processedProducts } };
      } catch (err) {
        ctx.badRequest("Error fetching category products", { error: err });
      }
    },
  })
);
