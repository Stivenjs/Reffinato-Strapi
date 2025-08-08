import type { Schema, Struct } from '@strapi/strapi';

export interface ColorColorAttribute extends Struct.ComponentSchema {
  collectionName: 'components_color_color_attributes';
  info: {
    displayName: 'colorAttribute';
    icon: 'palette';
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface OrderOrderItem extends Struct.ComponentSchema {
  collectionName: 'components_order_order_items';
  info: {
    displayName: 'order-item';
  };
  attributes: {
    color: Schema.Attribute.String;
    product: Schema.Attribute.Relation<'manyToOne', 'api::product.product'>;
    quantity: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    size: Schema.Attribute.String;
    unitPrice: Schema.Attribute.Decimal & Schema.Attribute.Required;
  };
}

export interface SizeSizeAttribute extends Struct.ComponentSchema {
  collectionName: 'components_size_size_attributes';
  info: {
    displayName: 'sizeAttribute';
    icon: 'ruler';
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'color.color-attribute': ColorColorAttribute;
      'order.order-item': OrderOrderItem;
      'size.size-attribute': SizeSizeAttribute;
    }
  }
}
