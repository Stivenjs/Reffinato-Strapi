/**
 * social-shop router
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("api::social-shop.social-shop");

// Rutas personalizadas adicionales
export const customRoutes = {
  routes: [
    {
      method: "GET",
      path: "/social-shops/active",
      handler: "social-shop.findActive",
      config: {
        auth: false,
      },
    },
  ],
};
