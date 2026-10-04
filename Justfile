dev:
    npm run dev

build:
    npm run build

# Astro caches rendered Markdown by file content, so editing a plugin or the
# PlantUML skin won't re-render existing posts. Clear caches when that happens.
clean:
    npm run clean

# Downscale images in place: `just shrink --staged` or `just shrink path/to/*.jpg`
shrink *args:
    node scripts/images.mjs shrink {{args}}

# Enable the repo's git hooks (also done by `npm install`).
hooks:
    git config core.hooksPath .githooks
