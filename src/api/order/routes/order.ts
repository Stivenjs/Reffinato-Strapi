module.exports = {
  routes: [
    {
      method: "GET",
      path: "/orders/me",
      handler: "order.findMe",
      config: {
        policies: ["api::order.is-firebase-authenticated"],
        auth: false,
      },
    },
  ],
};
