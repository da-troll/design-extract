# Design Extract — Build Plan

## What it does
Reverse-engineers any website's complete design system by scraping it with a headless browser. Extracts color palette (with hex values and usage context), typography scale (font families, sizes, weights, line heights), spacing system, border radii, shadow definitions, and CSS custom properties. Outputs a structured, visual design token sheet.

## Where it fits
**Standalone useful tool for Daniel.** Useful for quickly understanding any site's design language — for inspiration, auditing, or bootstrapping a new project's design tokens. Also useful for the agent household when building UIs that need to match or reference existing designs.

## Scoped MVP
- FastAPI backend with Playwright headless Chromium
- Single `/api/extract` endpoint: takes a URL, returns structured design tokens
- Extract 6 categories: colors, typography, spacing, border-radius, shadows, CSS custom properties
- Visual frontend: URL input → loading → rich visual results with color swatches, type specimens, spacing scale
- Copyable values (click to copy hex, font stacks, etc.)
- Export as JSON

## Real data
No household data needed — this tool works on any public URL.

## Build tasks
1. Scaffold Vite + React + Tailwind frontend
2. FastAPI backend with Playwright extraction engine
3. Extraction modules: colors, typography, spacing, borders, shadows, custom props
4. Frontend: URL input, results display with visual swatches/specimens
5. Deploy as server-side MVP via pm2
