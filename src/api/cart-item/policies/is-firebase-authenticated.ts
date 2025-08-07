import * as admin from "firebase-admin";
import * as path from "path";

const serviceAccount = require(
  path.resolve(
    process.cwd(),
    "reffinato-dev-firebase-adminsdk-fbsvc-fa64e30373.json"
  )
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default async (ctx: any, config: any, { strapi }: any) => {
  const token = ctx.request.header.authorization;

  if (!token || !token.startsWith("Bearer ")) {
    return ctx.unauthorized("Missing or invalid Authorization header");
  }

  const idToken = token.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    ctx.state.user = decodedToken;
    return true;
  } catch (error: any) {
    strapi.log.error("Firebase authentication failed:", error.message);
    return ctx.unauthorized("Invalid Firebase token");
  }
};
