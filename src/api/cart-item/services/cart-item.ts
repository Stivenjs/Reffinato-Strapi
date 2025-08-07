/**
 * cart-item service
 */

import { factories } from "@strapi/strapi";

type ID = string | number;

export default factories.createCoreService(
  "api::cart-item.cart-item" as any,
  ({ strapi }) => ({
    async addProductToCart(firebaseUid: string, data: any) {
      const { productId, quantity, size, color, price, productName } = data;

      // Buscar el usuario de Strapi
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

      // Buscar el producto en Strapi para asegurar que existe y obtener la relación real
      const productEntity = await strapi.entityService.findOne(
        "api::product.product" as any,
        productId
      );
      if (!productEntity) {
        throw new Error("Product not found.");
      }

      // Verificar si el producto ya existe en el carrito del usuario con la misma talla y color
      const existingCartItem = await strapi.entityService.findMany(
        "api::cart-item.cart-item" as any,
        {
          filters: {
            user: userId,
            product: productId,
            size: size,
            color: color,
          },
        }
      );

      if (existingCartItem && existingCartItem.length > 0) {
        // Si existe, actualizar la cantidad
        const newQuantity = existingCartItem[0].quantity + quantity;
        await strapi.entityService.update(
          "api::cart-item.cart-item" as any,
          existingCartItem[0].id,
          {
            data: {
              quantity: newQuantity,
            },
          }
        );
        const updatedCartItemWithPopulate = await strapi.entityService.findOne(
          "api::cart-item.cart-item" as any,
          existingCartItem[0].id,
          {
            populate: ["product", "user"],
          }
        );
        return {
          message: "Quantity updated in cart",
          item: updatedCartItemWithPopulate,
        };
      } else {
        // Si no existe, crear un nuevo item en el carrito
        const newCartItem = await strapi.entityService.create(
          "api::cart-item.cart-item" as any,
          {
            data: {
              user: userId,
              product: productId,
              quantity: quantity,
              size: size,
              color: color,
              price: price,
              productName: productName,
            },
          }
        );
        const newCartItemWithPopulate = await strapi.entityService.findOne(
          "api::cart-item.cart-item" as any,
          newCartItem.id,
          {
            populate: ["product", "user"],
          }
        );
        return {
          message: "Product added to cart",
          item: newCartItemWithPopulate,
        };
      }
    },

    async removeProductFromCart(
      firebaseUid: string,
      productId: ID,
      size: string,
      color: string
    ) {
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

      // Encontrar el cart-item específico a eliminar
      const cartItemToDelete = await strapi.entityService.findMany(
        "api::cart-item.cart-item" as any,
        {
          filters: {
            user: userId,
            product: productId,
            size: size,
            color: color,
          },
        }
      );

      if (cartItemToDelete && cartItemToDelete.length > 0) {
        const result = await strapi.entityService.delete(
          "api::cart-item.cart-item" as any,
          cartItemToDelete[0].id
        );
        return { message: "Product removed from cart", item: result };
      } else {
        throw new Error("Product not found in cart");
      }
    },

    async updateProductQuantity(
      firebaseUid: string,
      productId: ID,
      size: string,
      quantity: number,
      color: string
    ) {
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

      // Encontrar el cart-item específico a actualizar
      const cartItemToUpdate = await strapi.entityService.findMany(
        "api::cart-item.cart-item" as any,
        {
          filters: {
            user: userId,
            product: productId,
            size: size,
            color: color,
          },
        }
      );

      if (cartItemToUpdate && cartItemToUpdate.length > 0) {
        const updatedCartItem = await strapi.entityService.update(
          "api::cart-item.cart-item" as any,
          cartItemToUpdate[0].id,
          {
            data: {
              quantity: quantity,
            },
            populate: ["product", "user"], // Asegurarse de poblar en la respuesta
          }
        );
        return {
          message: "Quantity updated in cart",
          item: updatedCartItem,
        };
      } else {
        throw new Error("Product not found in cart");
      }
    },

    async getUserCart(firebaseUid: string) {
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

      const cartItems = await strapi.entityService.findMany(
        "api::cart-item.cart-item" as any,
        {
          filters: { user: userId },
          populate: [
            "product",
            "product.photos",
            "product.colors",
            "product.sizes",
            "user",
          ], // Popula el producto y sus fotos, colores, tallas, y el usuario
        }
      );

      // Procesar los cartItems para incluir solo una URL por foto de producto
      const processedCartItems = cartItems.map((cartItem: any) => {
        if (cartItem.product && cartItem.product.photos) {
          cartItem.product.photos = cartItem.product.photos.map(
            (photo: any) => ({
              id: photo.id,
              url: photo.url,
            })
          );
        }
        return cartItem;
      });

      return processedCartItems;
    },

    async clearCart(firebaseUid: string) {
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

      const result = await strapi.db.query("api::cart-item.cart-item").delete({
        where: {
          user: userId,
        },
      });

      if (result.affected > 0) {
        return { message: "Cart cleared" };
      } else {
        throw new Error("Cart not found or already empty");
      }
    },
  })
);
 