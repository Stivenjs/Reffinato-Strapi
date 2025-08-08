import * as admin from "firebase-admin";

function initializeFirebaseAdmin(): admin.app.App {
  if (!admin.apps.length) {
    const base64Credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;

    if (base64Credentials && base64Credentials.trim().length > 0) {
      const serviceAccount = JSON.parse(
        Buffer.from(base64Credentials, "base64").toString("utf8")
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Fallback a ADC (GOOGLE_APPLICATION_CREDENTIALS, Workload Identity, etc.)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  return admin.app();
}

// Asegura inicialización una vez y exporta la instancia de admin
initializeFirebaseAdmin();

export default admin;
