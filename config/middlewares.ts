export default [
  "strapi::logger",
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "fasttify-medusa.s3.us-east-2.amazonaws.com",
          ],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            "fasttify-medusa.s3.us-east-2.amazonaws.com",
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  "strapi::errors",
  {
    name: "strapi::cors",
    config: {
      origin: [
        "https://www.gmcamisetas.store",
        "http://localhost:5173",
        "http://localhost:1337",
        "fe8cb390b91f.ngrok-free.app",
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      headers: ["Content-Type", "Authorization"],
      credentials: true,
    },
  },
  "strapi::poweredBy",
  "strapi::query",
  {
    name: "strapi::body",
    config: {
      formLimit: "50mb",
      jsonLimit: "50mb",
      textLimit: "50mb",
      formidable: {
        maxFileSize: 100 * 1024 * 1024,
        multiples: true,
      },
    },
  },

  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
