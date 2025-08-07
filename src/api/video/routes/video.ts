/**
 * video router
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("api::video.video");

// Rutas personalizadas adicionales
export const customRoutes = {
  routes: [
    {
      method: "GET",
      path: "/videos/active",
      handler: "video.findActive",
      config: {
        auth: false,
      },
    },
  ],
};
