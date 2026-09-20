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
