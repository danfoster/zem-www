import { defineConfig } from 'astro/config';
import { unified, rehypeHeadingIds } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import remarkDirectives from './src/plugins/remark-directives.mjs';
import remarkPlantuml from './src/plugins/remark-plantuml.mjs';
import rehypeHeadingAnchors from './src/plugins/rehype-heading-anchors.mjs';

export default defineConfig({
  site: 'https://www.zem.org.uk',
  // Match the URLs Hugo produced: /post/slug/ with a trailing slash.
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    // Astro 7 defaults to the Sätteri processor, which doesn't run remark
    // plugins. PlantUML and the notice/youtube directives are remark plugins.
    processor: unified({
      remarkPlugins: [remarkDirective, remarkDirectives, remarkPlantuml],
      // Astro assigns heading ids after user plugins run, so do it first for the anchors.
      rehypePlugins: [rehypeHeadingIds, rehypeHeadingAnchors],
    }),
    // Two themes, emitted as CSS variables; global.css picks one to match the site theme.
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false },
  },
});
