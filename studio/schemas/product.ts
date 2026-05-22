import { defineField, defineType } from 'sanity';
import { pinyin } from 'pinyin-pro';

export const product = defineType({
  name: 'product',
  title: 'Product 产品',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: '产品名称',
      type: 'string',
      validation: R => R.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL) — 先填产品名称，再点 Generate 自动转拼音',
      type: 'slug',
      options: {
        source: 'name',
        slugify: (input: string) =>
          pinyin(input, { toneType: 'none', separator: '-', v: true })
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
      },
      validation: R => R.required(),
    }),
    defineField({
      name: 'collection',
      title: '系列/季节 (可选，如 AW26 / SS25)',
      type: 'string',
      placeholder: '例如: AW26',
    }),
    defineField({
      name: 'active',
      title: '上架显示',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'category',
      title: '分类',
      type: 'string',
      options: {
        list: [
          { title: 'Fabric 面料',         value: 'fabric'    },
          { title: 'Swatch Bundle 色样包', value: 'sample'    },
          { title: 'Garment 成衣',         value: 'garment'   },
          { title: 'Trimming 辅料',        value: 'trimming'  },
        ],
        layout: 'radio',
      },
      validation: R => R.required(),
    }),
    defineField({
      name: 'badge',
      title: '标签 (可选)',
      type: 'string',
      options: {
        list: [
          { title: 'NEW',  value: 'new'  },
          { title: 'HOT',  value: 'hot'  },
          { title: 'SALE', value: 'sale' },
        ],
      },
    }),
    defineField({
      name: 'images',
      title: '产品图片 (可多张，支持拖拽排序)',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: R => R.min(1).error('至少上传一张图片'),
    }),
    defineField({
      name: 'video',
      title: '视频 (可选，上传 MP4)',
      type: 'file',
      options: { accept: 'video/mp4,video/quicktime' },
    }),
    defineField({
      name: 'price',
      title: '价格 (USD)',
      type: 'number',
      validation: R => R.required().positive(),
    }),
    defineField({
      name: 'unit',
      title: '单位',
      type: 'string',
      options: {
        list: ['/m', '/set', '/pc', '/kg'],
        layout: 'radio',
      },
      initialValue: '/m',
    }),
    defineField({
      name: 'moq',
      title: '最低起订说明',
      type: 'string',
      placeholder: '例如: Min. 20m  /  Ships worldwide  /  Min. 100 pcs',
    }),
    defineField({
      name: 'composition',
      title: '成分 / Composition',
      type: 'string',
      placeholder: '例如: 80% Silk 20% Spandex  /  100% Cotton  /  Polyester Lace',
      description: '面料成分，显示在产品卡片上',
    }),
    defineField({
      name: 'description',
      title: '产品描述',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: { title: 'name', media: 'images.0', subtitle: 'category' },
  },
});
