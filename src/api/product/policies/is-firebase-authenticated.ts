import admin from "../../../utils/firebase";

export default async (ctx, config, { strapi }) => {
  const { authorization } = ctx.request.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return ctx.unauthorized("No token provided or invalid format");
  }

  const idToken = authorization.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    ctx.state.user = decodedToken;
    return true;
  } catch (error) {
    strapi.log.error("Error verifying Firebase token:", error.message);
    return ctx.unauthorized("Invalid or expired Firebase token");
  }
};
