module.exports = {
  routes: [
    {
      method: "POST",
      path: "/memberships/sync",
      handler: "membership.syncFromStripe",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/memberships/me",
      handler: "membership.me",
      config: {
        auth: false,
        policies: ["api::payment.is-firebase-authenticated"],
      },
    },
  ],
};
