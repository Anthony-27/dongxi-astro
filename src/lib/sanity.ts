import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID ?? '0brclyd6',
  dataset:   import.meta.env.SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
});

const builder = imageUrlBuilder(client);

// 生成图片 URL，支持宽度/质量参数
// 用法: urlFor(image).width(800).url()
export function urlFor(source: any) {
  return builder.image(source);
}

// ── GROQ 查询 ──────────────────────────────────

export async function getProducts() {
  return client.fetch(`
    *[_type == "product" && active == true] | order(_createdAt desc) {
      _id,
      name,
      "slug": slug.current,
      collection,
      category,
      price,
      unit,
      moq,
      badge,
      description,
      images,
      video
    }
  `);
}

export async function getShowcase() {
  return client.fetch(`
    *[_type == "showcase" && active == true] | order(_createdAt desc) {
      _id,
      title,
      tag,
      category,
      meta,
      images
    }
  `);
}
