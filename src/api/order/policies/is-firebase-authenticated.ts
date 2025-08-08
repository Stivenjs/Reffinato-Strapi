import admin from "../../../utils/firebase";
import { errors } from "@strapi/utils";

const { UnauthorizedError } = errors;

export default async (policyContext, config, { strapi }) => {
  const { authorization } = policyContext.request.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided or invalid format");
  }

  const idToken = authorization.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    policyContext.state.user = decodedToken;
    return true;
  } catch (error) {
    strapi.log.error("Error verifying Firebase token:", error.message);
    throw new UnauthorizedError("Invalid or expired Firebase token");
  }
};
