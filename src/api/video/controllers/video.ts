/**
 * video controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::video.video" as any,
  ({ strapi }) => ({
    async find(ctx) {
      try {
        const videos = await strapi.entityService.findMany(
          "api::video.video" as any,
          {
            filters: {
              isActive: true,
            },
            populate: {
              video: { fields: ["id", "url", "name"] },
            },
            sort: { createdAt: "desc" },
          }
        );

        return { data: videos };
      } catch (err) {
        ctx.badRequest("Error fetching videos", { error: err });
      }
    },

    async findOne(ctx) {
      const { id } = ctx.params;
      try {
        const video = await strapi.entityService.findOne(
          "api::video.video" as any,
          id,
          {
            populate: {
              video: { fields: ["id", "url", "name"] },
            },
          }
        );

        if (!video) {
          return ctx.notFound("Video not found");
        }

        return { data: video };
      } catch (err) {
        ctx.badRequest("Error fetching video", { error: err });
      }
    },

    async findActive(ctx) {
      const { page = 1, pageSize = 10 } = ctx.query;

      try {
        const videos = await strapi.entityService.findMany(
          "api::video.video" as any,
          {
            filters: {
              isActive: true,
            },
            populate: {
              video: { fields: ["id", "url", "name"] },
            },
            sort: { createdAt: "desc" },
            pagination: {
              page: parseInt(page as string),
              pageSize: parseInt(pageSize as string),
            },
          }
        );

        return { data: videos };
      } catch (err) {
        ctx.badRequest("Error fetching active videos", { error: err });
      }
    },
  })
);
