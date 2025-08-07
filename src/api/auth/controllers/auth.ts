/**
 * auth controller
 */

import { factories } from "@strapi/strapi";
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

export default factories.createCoreController(
  "api::auth.auth",
  ({ strapi }) => ({
    async createUser(ctx) {
      const { email, password, displayName } = ctx.request.body;

      if (!email || !password || !displayName) {
        return ctx.badRequest("Missing required fields");
      }

      try {
        const userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: displayName,
        });

        const { uid } = userRecord;

        const newUser = await strapi.entityService.create("api::auth.auth", {
          data: {
            uid: uid,
            email: email,
            name: displayName,
          },
        });

        const token = await admin.auth().createCustomToken(uid);

        ctx.created({
          message: "User created successfully",
          user: newUser,
          token: token,
        });
      } catch (error) {
        console.error("Error creating user:", error);

        if (error.code === "auth/email-already-exists") {
          return ctx.badRequest("Email is already in use.");
        }

        ctx.internalServerError("Error creating user", {
          error: error.message,
        });
      }
    },

    async socialLogin(ctx) {
      const { uid, email, displayName, token } = ctx.request.body;

      if (!uid || !email || !displayName || !token) {
        return ctx.badRequest("Missing required fields for social login");
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(token);

        if (decodedToken.uid !== uid) {
          return ctx.unauthorized("Invalid token");
        }

        // Verificar si el usuario ya existe en la base de datos de Strapi
        const existingUser = await strapi.entityService.findMany(
          "api::auth.auth",
          {
            filters: { uid: uid },
          }
        );

        if (existingUser.length === 0) {
          // Si el usuario no existe, se inserta en la base de datos de Strapi
          await strapi.entityService.create("api::auth.auth", {
            data: {
              uid: uid,
              email: email,
              name: displayName,
            },
          });
        }

        ctx.send(
          {
            message: "User authenticated successfully",
            uid: uid,
          },
          200
        );
      } catch (error) {
        console.error("Error in social authentication:", error);
        ctx.internalServerError("Error in social authentication", {
          error: error.message,
        });
      }
    },

    async updateUserProfile(ctx) {
      const firebaseUid = ctx.state.user.uid;
      const { firstName, lastName, email, password, photoURL } =
        ctx.request.body;

      interface FirebaseUserUpdates {
        displayName?: string;
        email?: string;
        photoURL?: string;
        password?: string;
      }

      interface StrapiUserUpdates {
        name?: string;
        email?: string;
        profilePictureUrl?: string;
      }

      try {
        const currentUser = await admin.auth().getUser(firebaseUid);

        const firebaseUpdates: FirebaseUserUpdates = {};
        const strapiUpdates: StrapiUserUpdates = {};

        // Actualizar displayName en Firebase
        if (firstName || lastName) {
          const currentDisplayNameParts = currentUser.displayName
            ? currentUser.displayName.split(" ")
            : [];
          const newFirstName = firstName || currentDisplayNameParts[0] || "";
          const newLastName = lastName || currentDisplayNameParts[1] || "";
          firebaseUpdates.displayName = `${newFirstName} ${newLastName}`.trim();
          strapiUpdates.name = firebaseUpdates.displayName;
        }

        // Actualizar email en Firebase y Strapi
        if (email) {
          firebaseUpdates.email = email;
          strapiUpdates.email = email;
        }

        // Actualizar photoURL en Firebase y Strapi (asumiendo que viene ya subida a S3)
        if (photoURL) {
          firebaseUpdates.photoURL = photoURL;
          strapiUpdates.profilePictureUrl = photoURL;
        }

        // Realizar actualizaciones en Firebase Authentication
        if (Object.keys(firebaseUpdates).length > 0) {
          await admin.auth().updateUser(firebaseUid, firebaseUpdates);
        }

        // Actualizar contraseña en Firebase (si se proporciona)
        if (password) {
          await admin.auth().updateUser(firebaseUid, { password });
        }

        // Actualizar datos del usuario en Strapi
        if (Object.keys(strapiUpdates).length > 0) {
          const userInStrapi = await strapi.entityService.findMany(
            "api::auth.auth",
            {
              filters: { uid: firebaseUid },
            }
          );

          if (userInStrapi.length > 0) {
            await strapi.entityService.update(
              "api::auth.auth",
              userInStrapi[0].id,
              {
                data: strapiUpdates,
              }
            );
          }
        }

        // Obtener el usuario actualizado de Firebase para la respuesta final
        const finalUser = await admin.auth().getUser(firebaseUid);

        ctx.send(
          {
            message: "Profile updated successfully.",
            user: {
              displayName: finalUser.displayName,
              email: finalUser.email,
              photoURL: finalUser.photoURL,
            },
          },
          200
        );
      } catch (error) {
        console.error("Error updating profile:", error);

        if (error.code === "auth/email-already-exists") {
          return ctx.badRequest("Email already in use.");
        }

        ctx.internalServerError("Internal server error.", {
          error: error.message,
        });
      }
    },
  })
);
