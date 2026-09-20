import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export const PAGE_SIZE = 10;

// Posts live at blog/<year>/<slug>/index.md, so the id is "<year>/<slug>" and the canonical URL is
// /post/<year>/<slug>/. Older URLs that should keep working are listed in each post's `aliases`.
export const postUrl = (post: Post) => `/post/${post.id}/`;

// Same as Hugo's urlize for the tags we use: "Active Directory" -> "active-directory".
export const tagSlug = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, '-');

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  assertLayout(posts);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// Fail the build if the folder layout and the front matter disagree, or if two posts (or a post's
// alias and another post's real URL) would end up at the same URL.
function assertLayout(posts: Post[]) {
  const owner = new Map<string, string>();
  const claim = (url: string, id: string) => {
    const other = owner.get(url);
    if (other) throw new Error(`Posts "${id}" and "${other}" both claim the URL ${url}`);
    owner.set(url, id);
  };
  for (const post of posts) {
    const [year, ...rest] = post.id.split('/');
    if (!/^\d{4}$/.test(year) || rest.length !== 1)
      throw new Error(`Post "${post.id}" must live at src/content/blog/<year>/<slug>/index.md`);
    if (Number(year) !== post.data.date.getUTCFullYear())
      throw new Error(
        `Post "${post.id}" is in the ${year} folder but its date is ${post.data.date.toISOString().slice(0, 10)}`,
      );
    claim(postUrl(post), post.id);
    for (const alias of post.data.aliases) claim(alias, post.id);
  }
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
