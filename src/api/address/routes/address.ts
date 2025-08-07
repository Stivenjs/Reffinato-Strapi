/**
 * address router
 */

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/addresses",
      handler: "address.createAddress",
      config: {
        policies: ["api::address.is-firebase-authenticated"],
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/addresses/:id",
      handler: "address.updateAddress",
      config: {
        policies: ["api::address.is-firebase-authenticated"],
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/addresses/me",
      handler: "address.getUserAddresses",
      config: {
        policies: ["api::address.is-firebase-authenticated"],
        auth: false,
      },
    },
    {
      method: "DELETE",
      path: "/addresses/:id",
      handler: "address.deleteAddress",
      config: {
        policies: ["api::address.is-firebase-authenticated"],
        auth: false,
      },
    },
  ],
};
