import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../lib/posts';

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
      link: `/post/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>en-gb</language>',
  });
}
