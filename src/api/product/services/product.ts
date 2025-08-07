/**
 * product service
 */

import { factories } from "@strapi/strapi";

type ID = string | number;

interface ProductAttributes extends Record<string, any> {
  name: string;
  colors: string[];
  price: number;
  sizes: string[];
  description: string;
  details?: string;
  category: string;
  photos?: { id: ID; url: string; previewUrl?: string }[];
  originalPrice?: number; 
  discountPercentageApplied?: number; 
  promotionNameApplied?: string; 
}

export default factories.createCoreService(
  "api::product.product" as any,
  ({ strapi }) => ({
    async applySeasonalDiscount(product: ProductAttributes) {
      const now = new Date();

      const activePromotions = await strapi.entityService.findMany(
        "api::seasonal-promotion.seasonal-promotion" as any,
        {
          filters: {
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now },
          },
        }
      );

      if (activePromotions && activePromotions.length > 0) {
        const bestPromotion = activePromotions.reduce(
          (best: any, current: any) =>
            current.discountPercentage > best.discountPercentage
              ? current
              : best,
          activePromotions[0] 
        );

        const highestDiscount = bestPromotion.discountPercentage;
        const promotionName = bestPromotion.name;

        if (highestDiscount > 0) {
          const originalPrice = product.price;
          const discountedPrice = originalPrice * (1 - highestDiscount / 100);
          return {
            ...product,
            price: parseFloat(discountedPrice.toFixed(2)),
            originalPrice: parseFloat(originalPrice.toFixed(2)), 
            discountPercentageApplied: highestDiscount,
            promotionNameApplied: promotionName,
          };
        }
      }
      return { ...product, originalPrice: product.price };
    },

    async getProductsByCategory(category: string) {
      let products = await strapi.entityService.findMany(
        "api::product.product" as any,
        {
          filters: { category: category },
          populate: {
            photos: { fields: ["id", "url"] }, 
            colors: true, 
            sizes: true, 
            category: true,
          },
        }
      );
      products = await Promise.all(
        products.map((product: any) =>
          (this as any).applySeasonalDiscount(product)
        )
      );
      return products;
    },

    async getProductById(id: ID) {
      let product = await strapi.entityService.findOne(
        "api::product.product" as any,
        id,
        {
          populate: {
            photos: { fields: ["id", "url"] }, 
            colors: true,
            sizes: true,
            category: true,
          },
        }
      );
      if (product) {
        product = await (this as any).applySeasonalDiscount(product);
      }
      return product;
    },

    async getProductList() {
      let products = await strapi.entityService.findMany(
        "api::product.product" as any,
        {
          populate: {
            photos: { fields: ["id", "url"] }, 
            colors: true,
            sizes: true,
            category: true,
          },
        }
      );
      products = await Promise.all(
        products.map((product: any) =>
          (this as any).applySeasonalDiscount(product)
        )
      );
      return products;
    },
  })
);
