/**
 * cart-item router
 */



module.exports = {
  routes: [
    {
      method: "POST",
      path: "/cart/add",
      handler: "cart-item.addProductToCart",
      config: {
        policies: ["api::cart-item.is-firebase-authenticated"],
        auth: false, // Deshabilitar la autenticación JWT de Strapi
      },
    },
    {
      method: "DELETE",
      path: "/cart/remove",
      handler: "cart-item.removeProductFromCart",
      config: {
        policies: ["api::cart-item.is-firebase-authenticated"],
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/cart/update-quantity",
      handler: "cart-item.updateProductQuantity",
      config: {
        policies: ["api::cart-item.is-firebase-authenticated"],
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/cart",
      handler: "cart-item.getUserCart",
      config: {
        policies: ["api::cart-item.is-firebase-authenticated"],
        auth: false,
      },
    },
    {
      method: "DELETE",
      path: "/cart/clear",
      handler: "cart-item.clearCart",
      config: {
        policies: ["api::cart-item.is-firebase-authenticated"],
        auth: false,
      },
    },
  ],
};
