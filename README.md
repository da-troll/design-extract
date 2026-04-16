# Design Extract

Reverse-engineer any website's complete design system by pasting a URL. A headless browser scrapes the page, analyzes up to 3,000 DOM elements, and extracts structured design tokens: color palettes with usage context, typography scales with live specimens, spacing systems, border radii, shadow definitions, and CSS custom properties. Results are displayed in a visual dashboard with click-to-copy values and JSON export.

**Live URL:** [mvp.trollefsen.com/2026-04-16-design-extract](https://mvp.trollefsen.com/2026-04-16-design-extract/)

**Inspired by:** [Manavarya09/design-extract](https://github.com/Manavarya09/design-extract)

## Tech Stack

- React + TypeScript (Vite)
- Tailwind CSS v4
- FastAPI (Python)
- Playwright (headless Chromium)

## Features

- Headless browser extraction — navigates to any URL, waits for network idle + fonts, scrapes computed styles
- Color palette grouped by usage (background, text, border) with hex values and occurrence counts
- Typography scale showing font families, sizes, weights, line heights with actual rendered specimens
- Spacing system visualized as a proportional bar chart
- Border radius preview with visual shape rendering
- Box and text shadow catalog
- CSS custom properties table with inline color swatches
- Full-page screenshot capture
- JSON export of all extracted tokens
- Click-to-copy on every value
- Quick-fill suggestions for popular sites (Stripe, Linear, Vercel, GitHub)

---

*Built as part of the [Nightly MVP](https://mvp.trollefsen.com) series.*
