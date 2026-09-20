dev:
    npm run dev

build:
    npm run build

# Astro caches rendered Markdown by file content, so editing a plugin or the
# PlantUML skin won't re-render existing posts. Clear caches when that happens.
clean:
    npm run clean
