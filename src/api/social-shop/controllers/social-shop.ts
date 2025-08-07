/**
 * social-shop controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::social-shop.social-shop" as any,
  ({ strapi }) => ({
    // Sobrescribir el método find para obtener solo fotos activas ordenadas
    async find(ctx) {
      try {
        const socialShops = await strapi.entityService.findMany(
          "api::social-shop.social-shop" as any,
          {
            filters: {
              isActive: true,
            },
            populate: {
              photo: { fields: ["id", "url", "name"] }, // Solo datos esenciales de la foto
            },
            sort: { order: "asc", createdAt: "desc" }, // Ordenar por order y luego por fecha
          }
        );

        return { data: socialShops };
      } catch (err) {
        ctx.badRequest("Error fetching social shop photos", { error: err });
      }
    },

    // Sobrescribir el método findOne para obtener una foto específica
    async findOne(ctx) {
      const { id } = ctx.params;
      try {
        const socialShop = await strapi.entityService.findOne(
          "api::social-shop.social-shop" as any,
          id,
          {
            populate: {
              photo: { fields: ["id", "url", "name"] },
            },
          }
        );

        if (!socialShop) {
          return ctx.notFound("Social shop photo not found");
        }

        return { data: socialShop };
      } catch (err) {
        ctx.badRequest("Error fetching social shop photo", { error: err });
      }
    },

    // Método personalizado para obtener fotos activas con formato específico
    async findActive(ctx) {
      try {
        const socialShops = await strapi.entityService.findMany(
          "api::social-shop.social-shop" as any,
          {
            filters: {
              isActive: true,
            },
            populate: {
              photo: { fields: ["id", "url", "name"] },
            },
            sort: { order: "asc", createdAt: "desc" },
          }
        );

        // Formatear la fecha para que coincida con el formato esperado por el frontend
        const formattedData = socialShops.map((item: any) => ({
          ...item,
          date: new Date(item.date).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          }).toUpperCase()
        }));

        return { data: formattedData };
      } catch (err) {
        ctx.badRequest("Error fetching active social shop photos", { error: err });
      }
    },
  })
);
