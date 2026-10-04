#!/usr/bin/env node
// Keep blog images small.
//
//   node scripts/images.mjs check            fail if staged images are too big (used by pre-commit)
//   node scripts/images.mjs shrink <files>   downscale files in place
//   node scripts/images.mjs shrink --staged  downscale staged images in place and re-stage them
//
// Astro generates the sizes the site actually serves at build time, so the
// repo only needs a reasonably sized original.
import { execFileSync } from 'node:child_process';
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const MAX_DIM = 2000; // px, longest edge
const MAX_BYTES = 700 * 1024;
const EXT = /\.(jpe?g|png|webp)$/i;

const git = (args, opts = {}) =>
  execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024, ...opts });

const stagedImages = () =>
  git(['diff', '--cached', '--name-only', '--diff-filter=AM', '-z'])
    .toString()
    .split('\0')
    .filter((f) => EXT.test(f));

const kb = (n) => `${Math.round(n / 1024)}KB`;

async function check() {
  const bad = [];
  for (const file of stagedImages()) {
    const buf = git(['show', `:${file}`]);
    const { width = 0, height = 0 } = await sharp(buf).metadata();
    if (buf.length > MAX_BYTES || Math.max(width, height) > MAX_DIM) {
      bad.push(`  ${file}  (${width}x${height}, ${kb(buf.length)})`);
    }
  }
  if (!bad.length) return 0;
  console.error(
    `Images too large (limit ${MAX_DIM}px / ${kb(MAX_BYTES)}):\n${bad.join('\n')}\n\n` +
      `Fix with:  just shrink --staged\n` +
      `Bypass with:  git commit --no-verify`,
  );
  return 1;
}

// Photos saved as PNG are several times smaller as WebP. Only convert when it clearly wins,
// so flat-colour screenshots and diagrams stay lossless PNG.
const WEBP_WIN = 0.7;
const MIN_SAVING = 0.95; // leave files alone unless they shrink by at least 5%

// Rewrite references to a renamed file in the Markdown files of its directory and parents.
async function updateReferences(oldFile, newFile) {
  const root = git(['rev-parse', '--show-toplevel']).toString().trim();
  const touched = [];
  for (let dir = dirname(resolve(oldFile)); dir.startsWith(root); dir = dirname(dir)) {
    for (const name of await readdir(dir)) {
      if (!/\.mdx?$/.test(name)) continue;
      const md = join(dir, name);
      const text = await readFile(md, 'utf8');
      const from = relative(dir, resolve(oldFile));
      if (!text.includes(from)) continue;
      await writeFile(md, text.replaceAll(from, relative(dir, resolve(newFile))));
      touched.push(relative(root, md));
    }
  }
  return touched;
}

// Returns the new path if the file was renamed, true if shrunk in place, false if skipped.
async function shrinkFile(file) {
  const input = await readFile(file);
  const fmt = (await sharp(input).metadata()).format;
  const resized = () =>
    sharp(input).rotate().resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true });

  let output;
  let target = file;
  if (fmt === 'jpeg') output = await resized().jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  else if (fmt === 'webp') output = await resized().webp({ quality: 80 }).toBuffer();
  else {
    output = await resized().png({ compressionLevel: 9, effort: 10 }).toBuffer();
    const webp = await resized().webp({ quality: 80 }).toBuffer();
    if (webp.length < output.length * WEBP_WIN) {
      output = webp;
      target = file.replace(EXT, '.webp');
    }
  }

  if (output.length > input.length * MIN_SAVING) {
    console.log(`skip    ${file} (${kb(input.length)}, nothing worth saving)`);
    return false;
  }
  await writeFile(target, output);
  if (target === file) {
    console.log(`shrunk  ${file}: ${kb(input.length)} -> ${kb(output.length)}`);
    return true;
  }
  await unlink(file);
  console.log(`webp    ${file}: ${kb(input.length)} -> ${basename(target)} ${kb(output.length)}`);
  const updated = await updateReferences(file, target);
  for (const md of updated) console.log(`        updated references in ${md}`);
  return { newPath: target, updatedMd: updated };
}

async function shrink(args) {
  const staged = args.includes('--staged');
  const files = staged ? stagedImages() : args.filter((a) => EXT.test(a));
  if (!files.length) {
    console.error('No images given.');
    return 1;
  }
  for (const f of files) {
    const result = await shrinkFile(f);
    if (!result || !staged) continue;
    if (result === true) {
      git(['add', '--', f]);
    } else {
      git(['rm', '--cached', '-q', '--', f]);
      git(['add', '--', result.newPath, ...result.updatedMd]);
    }
  }
  return 0;
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'check') process.exit(await check());
if (cmd === 'shrink') process.exit(await shrink(rest));
console.error('usage: images.mjs check | shrink [--staged | files...]');
process.exit(2);
