// Makes /search/ work under `astro dev`.
//
// Pagefind builds its index from finished HTML, which only `astro build` produces. In dev this
// integration gets the same HTML by fetching the posts from the dev server itself, indexes it with
// Pagefind's Node API, and serves the result from memory at /pagefind/. It re-indexes when
// content changes. It only runs in dev; the production build indexes dist/ as usual.
import * as pagefind from 'pagefind';

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
const typeOf = (path) => TYPES[path.slice(path.lastIndexOf('.'))] ?? 'application/octet-stream';

export default function devSearch() {
  return {
    name: 'dev-search',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        const files = new Map(); // "pagefind.js" -> Buffer
        let origin = null;
        let running = false;
        let dirty = false;
        let timer;

        async function rebuild() {
          if (!origin) return;
          if (running) { dirty = true; return; }
          running = true;
          try {
            const started = Date.now();
            const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
            const posts = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
              .map((m) => new URL(m[1]).pathname)
              .filter((p) => /^\/post\/\d{4}\/[^/]+\/$/.test(p));

            const { index, errors } = await pagefind.createIndex();
            if (!index) throw new Error(errors.join(', '));
            for (const url of posts) {
              const res = await fetch(origin + url);
              if (res.ok) await index.addHTMLFile({ url, content: await res.text() });
            }
            const built = await index.getFiles();
            files.clear();
            for (const f of built.files) files.set(f.path, Buffer.from(f.content));
            await index.deleteIndex();
            await pagefind.close();
            logger.info(`search index ready: ${posts.length} posts in ${Date.now() - started}ms`);
          } catch (e) {
            logger.warn(`search index failed: ${e.message}`);
          } finally {
            running = false;
            if (dirty) { dirty = false; schedule(); }
          }
        }

        const schedule = () => { clearTimeout(timer); timer = setTimeout(rebuild, 800); };

        // Serve the in-memory index. Registered directly, so it runs ahead of Vite's own handling.
        server.middlewares.use('/pagefind', (req, res, next) => {
          const path = decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/^\//, '');
          const body = files.get(path);
          if (!body) return next();
          res.setHeader('Content-Type', typeOf(path));
          res.setHeader('Cache-Control', 'no-store');
          res.end(body);
        });

        // Re-index when a post changes (content only; layouts don't affect the searchable text).
        const onChange = (file) => { if (file.includes('/src/content/')) schedule(); };
        server.watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);

        // The dev server must be listening before it can be fetched from.
        server.httpServer?.once('listening', () => {
          const { port } = server.httpServer.address();
          origin = `http://localhost:${port}`;
          schedule();
        });
      },
    },
  };
}
