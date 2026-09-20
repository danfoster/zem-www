import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export const PAGE_SIZE = 10;

// Same as Hugo's urlize for the tags we use: "Active Directory" -> "active-directory".
export const tagSlug = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, '-');

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// Posts use inconsistent case ("Solaris" / "solaris"). The URL slug is
// normalised; the display name is whichever spelling is used most.
export function postTags(post: Post) {
  const seen = new Map<string, string>();
  for (const name of post.data.tags) if (!seen.has(tagSlug(name))) seen.set(tagSlug(name), name);
  return [...seen].map(([slug, name]) => ({ slug, name }));
}

export function collectTags(posts: Post[]) {
  const counts = new Map<string, Map<string, number>>();
  const bySlug = new Map<string, Post[]>();
  for (const post of posts) {
    for (const { slug, name } of postTags(post)) {
      const variants = counts.get(slug) ?? new Map<string, number>();
      variants.set(name, (variants.get(name) ?? 0) + 1);
      counts.set(slug, variants);
      bySlug.set(slug, [...(bySlug.get(slug) ?? []), post]);
    }
  }
  return [...bySlug]
    .map(([slug, posts]) => ({
      slug,
      posts,
      name: [...counts.get(slug)!].sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function paginate<T>(items: T[], size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  return Array.from({ length: pages }, (_, i) => ({
    number: i + 1,
    total: pages,
    items: items.slice(i * size, (i + 1) * size),
  }));
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
