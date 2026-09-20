import type { APIContext } from 'astro';
import { collectTags, getPosts, postUrl } from '../lib/posts';

// Kept at /sitemap.xml (Hugo's path) rather than the sitemap-index.xml that @astrojs/sitemap emits.
export async function GET(context: APIContext) {
  const posts = await getPosts();
  const site = context.site!;
  const urls = [
    { loc: '/' },
    { loc: '/post/' },
    { loc: '/tags/' },
    ...collectTags(posts).map((t) => ({ loc: `/tags/${t.slug}/` })),
    ...posts.map((p) => ({ loc: postUrl(p), lastmod: p.data.date.toISOString().slice(0, 10) })),
  ];
  const body = urls
    .map((u) => `<url><loc>${new URL(u.loc, site)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
