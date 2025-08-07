module.exports = {
  routes: [
    {
      method: "POST",
      path: "/promotion-codes/apply",
      handler: "promotion-code.applyPromotionCode",
      config: {
        auth: false,
        policies: ["api::promotion-code.is-firebase-authenticated"],
      },
    },
  ],
};
