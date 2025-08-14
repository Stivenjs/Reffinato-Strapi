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
      path: "/payments/create-subscription-session",
      handler: "payment.createSubscriptionSession",
      config: {
        policies: ["api::payment.is-firebase-authenticated"],
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/payments/create-customer-portal-session",
      handler: "payment.createCustomerPortalSession",
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
