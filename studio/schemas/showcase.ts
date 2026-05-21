import { defineField, defineType } from 'sanity';

export const showcase = defineType({
  name: 'showcase',
  title: 'Showcase 作品展示',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '作品名称',
      type: 'string',
      validation: R => R.required(),
    }),
    defineField({
      name: 'active',
      title: '显示在网站',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'category',
      title: '分类',
      type: 'string',
      options: {
        list: [
          { title: 'Garment 成衣',     value: 'garment'    },
          { title: 'Fabric 面料',       value: 'fabric'     },
          { title: 'Embroidery 刺绣',   value: 'embroidery' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'tag',
      title: '标签文字 (显示在卡片顶部)',
      type: 'string',
      placeholder: '例如: Bead Embroidery · Evening',
    }),
    defineField({
      name: 'meta',
      title: '订单信息 (数量/客户地区)',
      type: 'string',
      placeholder: '例如: 280 pcs · UAE',
    }),
    defineField({
      name: 'images',
      title: '图片 (可多张)',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: R => R.min(1),
    }),
  ],
  preview: {
    select: { title: 'title', media: 'images.0', subtitle: 'meta' },
  },
});
