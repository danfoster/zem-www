// Renders ```plantuml fenced code blocks to inline SVG at build time, using the
// local `plantuml` binary. No network, no server.
//
//   ```plantuml {alt="Description of the diagram"}
//   Alice -> Bob : hello
//   ```
//
// The block body is wrapped in @startuml/@enduml with a shared skin
// (plantuml-skin.iuml). The skin uses a small set of colours that
// src/styles/plantuml.css maps onto theme variables, so diagrams follow
// light/dark mode.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { visit } from 'unist-util-visit';

// Bump to invalidate every cached diagram (e.g. after changing post-processing).
const CACHE_VERSION = '3';

const skinPath = fileURLToPath(new URL('./plantuml-skin.iuml', import.meta.url));
const cacheDir = fileURLToPath(new URL('../../node_modules/.cache/plantuml/', import.meta.url));

const escapeAttr = (s) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function runPlantuml(source) {
  return new Promise((resolve, reject) => {
    const child = spawn('plantuml', ['-tsvg', '-pipe'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [];
    const err = [];
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => err.push(d));
    child.on('error', (e) =>
      reject(
        e.code === 'ENOENT'
          ? new Error('plantuml not found on PATH (brew install plantuml / apt install plantuml graphviz)')
          : e,
      ),
    );
    child.on('close', (code) => {
      const stdout = Buffer.concat(out).toString();
      const stderr = Buffer.concat(err).toString().trim();
      // PlantUML exits non-zero (200) on syntax errors but still emits an
      // error-image SVG on stdout. Never let that reach the site.
      if (code !== 0) reject(new Error(`plantuml exited ${code}: ${stderr || 'diagram has errors'}`));
      else resolve(stdout);
    });
    child.stdin.end(source);
  });
}

// Make the SVG responsive and safe to inline. Colours are left alone: theming
// is done in CSS (see src/styles/plantuml.css). The natural width is kept as a
// max-width so small diagrams aren't blown up to the full column.
function tidy(svg) {
  return svg
    .replace(/<\?plantuml[^?]*\?>/g, '')
    .replace(/<svg\b[^>]*>/, (tag) => {
      const width = /\swidth="([\d.]+)px"/.exec(tag)?.[1];
      return tag
        .replace(/\swidth="[^"]*"/, '')
        .replace(/\sheight="[^"]*"/, '')
        .replace(/\sstyle="[^"]*"/, '')
        .replace(/\szoomAndPan="[^"]*"/, '')
        .replace(/\spreserveAspectRatio="[^"]*"/, '')
        .replace(/^<svg/, `<svg preserveAspectRatio="xMidYMid meet" aria-hidden="true"${width ? ` style="width:100%;max-width:${width}px"` : ''}`);
    });
}

export default function remarkPlantuml() {
  return async (tree, file) => {
    const skin = (await readFile(skinPath, 'utf8')).trim();
    const nodes = [];
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang === 'plantuml') nodes.push({ node, index, parent });
    });
    if (!nodes.length) return;

    await mkdir(cacheDir, { recursive: true });

    await Promise.all(
      nodes.map(async ({ node }) => {
        const body = node.value.trim();
        const source = `@startuml\n${skin}\n${body}\n@enduml\n`;
        const key = createHash('sha256').update(CACHE_VERSION).update(source).digest('hex');
        const cached = `${cacheDir}${key}.svg`;

        let svg;
        try {
          svg = await readFile(cached, 'utf8');
        } catch {
          try {
            svg = tidy(await runPlantuml(source));
          } catch (e) {
            const where = node.position ? `${file.path}:${node.position.start.line}` : file.path;
            throw new Error(`[plantuml] ${where}: ${e.message}`);
          }
          await writeFile(cached, svg);
        }

        const alt = /alt="([^"]*)"/.exec(node.meta ?? '')?.[1] ?? 'Diagram';
        node.type = 'html';
        node.value = `<figure class="plantuml" role="img" aria-label="${escapeAttr(alt)}">${svg}</figure>`;
        delete node.lang;
        delete node.meta;
      }),
    );
  };
}
