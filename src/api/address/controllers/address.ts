/**
 * address controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::address.address" as any, // Usar as any para ContentType
  ({ strapi }) => ({
    async createAddress(ctx) {
      const firebaseUid = ctx.state.user.uid;
      const { body } = ctx.request;

      try {
        // Validar campos requeridos antes de llamar al servicio
        if (
          !body.firstName ||
          !body.lastName ||
          !body.address ||
          !body.city ||
          !body.country ||
          !body.zipCode ||
          !body.phone
        ) {
          return ctx.badRequest("Missing required address fields");
        }
        const newAddress = await strapi
          .service("api::address.address" as any)
          .createAddress(firebaseUid, body);
        ctx.created({
          success: true,
          message: "Address created successfully",
          data: newAddress,
        });
      } catch (error) {
        console.error("Error creating address:", error);
        if (
          error.message ===
          "User not found in Strapi for the given Firebase UID."
        ) {
          return ctx.unauthorized(error.message);
        }
        ctx.internalServerError("Error creating address", {
          error: error.message,
        });
      }
    },

    async updateAddress(ctx) {
      const firebaseUid = ctx.state.user.uid;
      const { id } = ctx.params;
      const { body } = ctx.request;

      try {
        const updatedAddress = await strapi
          .service("api::address.address" as any)
          .updateAddress(firebaseUid, id, body);
        ctx.send(
          {
            success: true,
            message: "Address updated successfully",
            data: updatedAddress,
          },
          200
        );
      } catch (error) {
        console.error("Error updating address:", error);
        if (
          error.message ===
          "Address not found or does not belong to the authenticated user."
        ) {
          return ctx.unauthorized(error.message);
        }
        ctx.internalServerError("Error updating address", {
          error: error.message,
        });
      }
    },

    async getUserAddresses(ctx) {
      const firebaseUid = ctx.state.user.uid;

      try {
        const userAddresses = await strapi
          .service("api::address.address" as any)
          .getUserAddresses(firebaseUid);
        ctx.send(
          {
            success: true,
            message: "Addresses retrieved successfully",
            data: userAddresses,
          },
          200
        );
      } catch (error) {
        console.error("Error retrieving user addresses:", error);
        if (error.message === "No addresses found for this user.") {
          return ctx.notFound(error.message);
        }
        if (
          error.message ===
          "User not found in Strapi for the given Firebase UID."
        ) {
          return ctx.unauthorized(error.message);
        }
        ctx.internalServerError("Error retrieving user addresses", {
          error: error.message,
        });
      }
    },

    async deleteAddress(ctx) {
      const firebaseUid = ctx.state.user.uid;
      const { id } = ctx.params;

      try {
        await strapi
          .service("api::address.address" as any)
          .deleteAddress(firebaseUid, id);
        ctx.send(
          {
            success: true,
            message: "Address deleted successfully",
          },
          200
        );
      } catch (error) {
        console.error("Error deleting address:", error);
        if (
          error.message ===
          "Address not found or does not belong to the authenticated user."
        ) {
          return ctx.unauthorized(error.message);
        }
        ctx.internalServerError("Error deleting address", {
          error: error.message,
        });
      }
    },
  })
);
