/**
 * product router
 */

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/products",
      handler: "product.getProductList",
      config: {
        auth: false, // Público, no requiere autenticación
      },
    },
    {
      method: "GET",
      path: "/products/:id",
      handler: "product.getProductById",
      config: {
        auth: false, // Público, no requiere autenticación
      },
    },
    {
      method: "GET",
      path: "/products/category/:category",
      handler: "product.getProductsByCategory",
      config: {
        auth: false, // Público, no requiere autenticación
      },
    },
  ],
};
