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
      'size.size-attribute': SizeSizeAttribute;
    }
  }
}
