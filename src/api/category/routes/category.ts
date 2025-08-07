/**
 * category router
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/categories",
      handler: "category.find",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/categories/:id",
      handler: "category.findOne",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/categories/:id/products",
      handler: "category.findProductsByCategory",
      config: {
        auth: false,
      },
    },
  ],
};
