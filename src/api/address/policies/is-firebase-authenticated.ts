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
    console.error("Error verifying Firebase token:", error.message);
    return policyContext.unauthorized("Invalid or expired Firebase token");
  }
};
