module.exports = {
  routes: [
    {
      method: "POST",
      path: "/payments/create-checkout-session",
      handler: "payment.createCheckoutSession",
      config: {
        policies: ["api::payment.is-firebase-authenticated"],
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/payments/webhook",
      handler: "webhook.handleStripeWebhook",
      config: {
        auth: false,
      },
    },
  ],
};
