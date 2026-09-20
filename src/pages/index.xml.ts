import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, postUrl } from '../lib/posts';

// Served at /index.xml, the path Hugo used, so existing subscribers keep working.
export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: 'Zem',
    description: 'Writing and projects by Dan Foster.',
    site: context.site!,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: postUrl(post),
      // Posts that moved keep their original URL (the first alias) as the item ID, so feed readers
      // don't show them as new. Posts without aliases use their own URL, which is the default.
      customData: post.data.aliases[0]
        ? `<guid isPermaLink="true">${new URL(post.data.aliases[0], context.site).href}</guid>`
        : undefined,
      categories: post.data.tags,
    })),
    customData: '<language>en-gb</language>',
  });
}
