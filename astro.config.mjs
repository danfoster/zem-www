import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import remarkDirectives from './src/plugins/remark-directives.mjs';
import remarkPlantuml from './src/plugins/remark-plantuml.mjs';

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
    }),
    shikiConfig: { theme: 'dracula' },
  },
});
