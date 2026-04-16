"""
Design Extract — FastAPI backend
Headless browser scraping + design token extraction
"""
import json
import os
import re
from pathlib import Path
from collections import Counter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from playwright.sync_api import sync_playwright

app = FastAPI(title="Design Extract")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EXTRACTION_JS = """
() => {
    const MAX_ELEMENTS = 3000;
    const elements = document.querySelectorAll('*');
    const subset = Array.from(elements).slice(0, MAX_ELEMENTS);

    const colors = [];
    const fonts = [];
    const spacings = [];
    const radii = [];
    const shadows = [];

    for (const el of subset) {
        const s = window.getComputedStyle(el);
        const tag = el.tagName.toLowerCase();

        // Colors
        const bg = s.backgroundColor;
        const fg = s.color;
        const border = s.borderColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            colors.push({ value: bg, context: 'background', tag });
        }
        if (fg) {
            colors.push({ value: fg, context: 'text', tag });
        }
        if (border && border !== 'rgba(0, 0, 0, 0)' && border !== fg && border !== bg) {
            colors.push({ value: border, context: 'border', tag });
        }

        // Typography
        if (el.textContent && el.textContent.trim().length > 0 && el.children.length === 0) {
            fonts.push({
                family: s.fontFamily,
                size: s.fontSize,
                weight: s.fontWeight,
                lineHeight: s.lineHeight,
                letterSpacing: s.letterSpacing,
                tag,
                sample: el.textContent.trim().slice(0, 60)
            });
        }

        // Spacing
        const mt = s.marginTop, mr = s.marginRight, mb = s.marginBottom, ml = s.marginLeft;
        const pt = s.paddingTop, pr = s.paddingRight, pb = s.paddingBottom, pl = s.paddingLeft;
        const gap = s.gap;
        [mt, mr, mb, ml, pt, pr, pb, pl].forEach(v => {
            if (v && v !== '0px' && v !== 'auto' && v !== 'normal') spacings.push(v);
        });
        if (gap && gap !== 'normal' && gap !== '0px') spacings.push(gap);

        // Border radius
        const br = s.borderRadius;
        if (br && br !== '0px') radii.push(br);

        // Shadows
        const bs = s.boxShadow;
        const ts = s.textShadow;
        if (bs && bs !== 'none') shadows.push({ value: bs, type: 'box' });
        if (ts && ts !== 'none') shadows.push({ value: ts, type: 'text' });
    }

    // CSS custom properties from stylesheets
    const customProps = [];
    try {
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    const text = rule.cssText || '';
                    const matches = text.matchAll(/--([\\w-]+)\\s*:\\s*([^;]+)/g);
                    for (const m of matches) {
                        customProps.push({ name: '--' + m[1], value: m[2].trim() });
                    }
                }
            } catch (e) { /* cross-origin */ }
        }
    } catch (e) {}

    // Also get computed custom properties from :root
    const rootStyle = getComputedStyle(document.documentElement);
    const rootProps = [];
    try {
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.selectorText === ':root' || rule.selectorText === 'html') {
                        for (let i = 0; i < rule.style.length; i++) {
                            const prop = rule.style[i];
                            if (prop.startsWith('--')) {
                                rootProps.push({
                                    name: prop,
                                    value: rootStyle.getPropertyValue(prop).trim()
                                });
                            }
                        }
                    }
                }
            } catch(e) {}
        }
    } catch(e) {}

    return {
        url: window.location.href,
        title: document.title,
        colors,
        fonts,
        spacings,
        radii,
        shadows,
        customProps: rootProps.length > 0 ? rootProps : customProps,
        meta: {
            elementsScanned: subset.length,
            totalElements: elements.length
        }
    };
}
"""


def rgba_to_hex(rgba_str: str) -> str | None:
    m = re.match(r'rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)', rgba_str)
    if m:
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f'#{r:02x}{g:02x}{b:02x}'
    if rgba_str.startswith('#'):
        return rgba_str.lower()
    return None


def parse_px(val: str) -> float | None:
    m = re.match(r'([\d.]+)px', val)
    return float(m.group(1)) if m else None


def process_colors(raw_colors: list) -> list:
    color_map: dict[str, dict] = {}
    for c in raw_colors:
        hex_val = rgba_to_hex(c['value'])
        if not hex_val:
            continue
        if hex_val not in color_map:
            color_map[hex_val] = {
                'hex': hex_val,
                'raw': c['value'],
                'contexts': Counter(),
                'tags': Counter(),
                'count': 0
            }
        color_map[hex_val]['contexts'][c['context']] += 1
        color_map[hex_val]['tags'][c['tag']] += 1
        color_map[hex_val]['count'] += 1

    results = []
    for hex_val, info in sorted(color_map.items(), key=lambda x: -x[1]['count']):
        top_context = info['contexts'].most_common(1)[0][0] if info['contexts'] else 'unknown'
        results.append({
            'hex': hex_val,
            'count': info['count'],
            'usage': top_context,
            'contexts': dict(info['contexts']),
        })
    return results[:40]


def process_typography(raw_fonts: list) -> list:
    seen: dict[str, dict] = {}
    for f in raw_fonts:
        key = f'{f["family"]}|{f["size"]}|{f["weight"]}'
        if key not in seen:
            seen[key] = {
                'family': f['family'].split(',')[0].strip().strip("'\""),
                'fullFamily': f['family'],
                'size': f['size'],
                'sizePx': parse_px(f['size']),
                'weight': f['weight'],
                'lineHeight': f['lineHeight'],
                'letterSpacing': f['letterSpacing'],
                'tag': f['tag'],
                'sample': f['sample'],
                'count': 0
            }
        seen[key]['count'] += 1

    results = sorted(seen.values(), key=lambda x: -(x['sizePx'] or 0))
    return results[:30]


def process_spacing(raw_spacings: list) -> list:
    counter = Counter()
    for s in raw_spacings:
        px = parse_px(s)
        if px is not None and 0 < px <= 200:
            counter[s] += 1
    results = []
    for val, count in counter.most_common(20):
        results.append({'value': val, 'px': parse_px(val), 'count': count})
    return sorted(results, key=lambda x: x['px'] or 0)


def process_radii(raw_radii: list) -> list:
    counter = Counter(raw_radii)
    results = []
    for val, count in counter.most_common(15):
        results.append({'value': val, 'count': count})
    return results


def process_shadows(raw_shadows: list) -> list:
    seen: dict[str, dict] = {}
    for s in raw_shadows:
        val = s['value']
        if val not in seen:
            seen[val] = {'value': val, 'type': s['type'], 'count': 0}
        seen[val]['count'] += 1
    return sorted(seen.values(), key=lambda x: -x['count'])[:15]


def extract_design(url: str) -> dict:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
        except Exception:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)

        page.wait_for_timeout(2000)

        raw = page.evaluate(EXTRACTION_JS)

        screenshot = None
        try:
            screenshot_bytes = page.screenshot(full_page=False)
            import base64
            screenshot = base64.b64encode(screenshot_bytes).decode()
        except Exception:
            pass

        browser.close()

    return {
        'url': raw['url'],
        'title': raw['title'],
        'colors': process_colors(raw['colors']),
        'typography': process_typography(raw['fonts']),
        'spacing': process_spacing(raw['spacings']),
        'radii': process_radii(raw['radii']),
        'shadows': process_shadows(raw['shadows']),
        'customProperties': raw['customProps'][:50],
        'meta': raw['meta'],
        'screenshot': screenshot,
    }


class ExtractRequest(BaseModel):
    url: str


@app.post("/api/extract")
async def api_extract(req: ExtractRequest):
    url = req.url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    try:
        import asyncio
        result = await asyncio.to_thread(extract_design, url)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)[:300]}, status_code=500)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


_out = Path(__file__).parent / "out"
if _out.exists():
    app.mount("/", StaticFiles(directory=str(_out), html=True), name="static")
else:
    @app.get("/{path:path}")
    async def not_built(path: str):
        return JSONResponse({"error": "Frontend not built"}, status_code=503)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 3469))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
