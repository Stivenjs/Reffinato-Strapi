import admin from "../../../utils/firebase";

export default async (ctx: any, config: any, { strapi }: any) => {
  const { authorization } = ctx.request.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return ctx.unauthorized("Missing or invalid Authorization header");
  }

  const idToken = authorization.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    ctx.state.user = decodedToken;
    return true;
  } catch (error: any) {
    strapi.log.error("Firebase authentication failed:", error.message);
    return ctx.unauthorized("Invalid Firebase token");
  }
};
