import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Page bundles (slug/index.md) get the id "slug", standalone files "slug".
const generateId = ({ entry }: { entry: string }) => entry.replace(/(\/index)?\.mdx?$/, '');

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog', generateId }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      description: z.string().optional(),
      tags: z.array(z.string()).default([]),
      // Old URLs that should redirect to this post, e.g. ["/post/kerberos-kdc/"]. Only needed for
      // posts that were already published at a different URL; leave it off for new posts. The first
      // entry is treated as the post's original URL (see the feed's item IDs in pages/index.xml.ts).
      aliases: z.array(z.string().regex(/^\/.+\/$/, 'aliases must look like "/post/old-name/"')).default([]),
      cover: z.object({ image: image() }).optional(),
      draft: z.boolean().default(false),
    }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects', generateId }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      status: z.enum(['active', 'maintained', 'archived', 'idea']).default('active'),
      tech: z.array(z.string()).default([]),
      repo: z.url().optional(),
      url: z.url().optional(),
      featured: z.boolean().default(false),
      order: z.number().default(100),
      cover: image().optional(),
    }),
});

export const collections = { blog, projects };
