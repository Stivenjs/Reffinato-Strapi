/**
 * auth router
 */

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/auths",
      handler: "auth.find",
      config: {
        policies: ["api::auth.is-firebase-authenticated"],
      },
    },
    {
      method: "GET",
      path: "/auths/:id",
      handler: "auth.findOne",
      config: {
        policies: ["api::auth.is-firebase-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/auths",
      handler: "auth.create",
      config: {
        policies: ["api::auth.is-firebase-authenticated"],
      },
    },
    {
      method: "PUT",
      path: "/auths/:id",
      handler: "auth.update",
      config: {
        policies: ["api::auth.is-firebase-authenticated"],
      },
    },
    {
      method: "DELETE",
      path: "/auths/:id",
      handler: "auth.delete",
      config: {
        policies: ["api::auth.is-firebase-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/auth/register",
      handler: "auth.createUser",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/auth/social-login",
      handler: "auth.socialLogin",
      config: {
        auth: false,
        policies: ["api::auth.is-firebase-authenticated"],
      },
    },
    {
      method: "PUT",
      path: "/auth/profile",
      handler: "auth.updateUserProfile",
      config: {
        policies: ["api::auth.is-firebase-authenticated"],
        auth: false,
      },
    },
  ],
};
