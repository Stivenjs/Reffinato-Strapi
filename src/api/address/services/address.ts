/**
 * address service
 */

import { factories } from "@strapi/strapi";

type ID = string | number;

interface PopulatedAddress extends Record<string, any> {
  id: ID;
  user?: { id: ID; uid?: string };
}

export default factories.createCoreService(
  "api::address.address" as any,
  ({ strapi }) => ({
    async createAddress(firebaseUid: string, data: any) {
      const {
        firstName,
        lastName,
        companyName,
        address,
        addressLine2,
        city,
        country,
        region,
        zipCode,
        phone,
        isDefault,
      } = data;

      const strapiUser = await strapi.entityService.findMany(
        "api::auth.auth" as any,
        {
          filters: { uid: firebaseUid },
        }
      );

      if (!strapiUser || strapiUser.length === 0) {
        throw new Error("User not found in Strapi for the given Firebase UID.");
      }

      const userId = strapiUser[0].id;

      const newAddress = await strapi.entityService.create(
        "api::address.address" as any,
        {
          data: {
            firstName,
            lastName,
            companyName,
            address,
            addressLine2,
            city,
            country,
            region,
            zipCode,
            phone,
            isDefault,
            user: userId,
          },
        }
      );

      return newAddress;
    },

    async updateAddress(firebaseUid: string, addressId: ID, data: any) {
      const {
        firstName,
        lastName,
        companyName,
        address,
        addressLine2,
        city,
        country,
        region,
        zipCode,
        phone,
        isDefault,
      } = data;

      const existingAddress = (await strapi.entityService.findOne(
        "api::address.address" as any,
        addressId,
        {
          populate: ["user"],
        }
      )) as PopulatedAddress;

      if (!existingAddress || existingAddress.user?.uid !== firebaseUid) {
        throw new Error(
          "Address not found or does not belong to the authenticated user."
        );
      }

      const updatedAddress = await strapi.entityService.update(
        "api::address.address" as any,
        addressId,
        {
          data: {
            firstName,
            lastName,
            companyName,
            address,
            addressLine2,
            city,
            country,
            region,
            zipCode,
            phone,
            isDefault,
          },
        }
      );

      return updatedAddress;
    },

    async getUserAddresses(firebaseUid: string) {
      const strapiUser = await strapi.entityService.findMany(
        "api::auth.auth" as any,
        {
          filters: { uid: firebaseUid },
        }
      );

      if (!strapiUser || strapiUser.length === 0) {
        throw new Error("User not found in Strapi for the given Firebase UID.");
      }

      const userId = strapiUser[0].id;

      const userAddresses = await strapi.entityService.findMany(
        "api::address.address" as any,
        {
          filters: { user: userId },
        }
      );

      return userAddresses;
    },

    async deleteAddress(firebaseUid: string, addressId: ID) {
      const existingAddress = (await strapi.entityService.findOne(
        "api::address.address" as any,
        addressId,
        {
          populate: ["user"],
        }
      )) as PopulatedAddress;

      if (!existingAddress || existingAddress.user?.uid !== firebaseUid) {
        throw new Error(
          "Address not found or does not belong to the authenticated user."
        );
      }

      await strapi.entityService.delete(
        "api::address.address" as any,
        addressId
      );

      return { success: true };
    },
  })
);
