import admin from "../../../utils/firebase";

export default async (policyContext, config, { strapi }) => {
  const { authorization } = policyContext.request.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return policyContext.unauthorized("No token provided or invalid format");
  }

  const idToken = authorization.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    policyContext.state.user = decodedToken;
    return true;
  } catch (error) {
    strapi.log.error("Error verifying Firebase token:", error.message);
    return policyContext.unauthorized("Invalid or expired Firebase token");
  }
};
