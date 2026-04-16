import { useState } from 'react'
import { Search, Loader2, Copy, Check, Palette, Type, Ruler, Circle, Layers, Code2, Camera, Download } from 'lucide-react'

interface DesignResult {
  url: string
  title: string
  colors: ColorToken[]
  typography: TypographyToken[]
  spacing: SpacingToken[]
  radii: RadiusToken[]
  shadows: ShadowToken[]
  customProperties: CustomProp[]
  meta: { elementsScanned: number; totalElements: number }
  screenshot: string | null
}

interface ColorToken { hex: string; count: number; usage: string; contexts: Record<string, number> }
interface TypographyToken { family: string; fullFamily: string; size: string; sizePx: number | null; weight: string; lineHeight: string; letterSpacing: string; tag: string; sample: string; count: number }
interface SpacingToken { value: string; px: number | null; count: number }
interface RadiusToken { value: string; count: number }
interface ShadowToken { value: string; type: string; count: number }
interface CustomProp { name: string; value: string }

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DesignResult | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('colors')

  async function extract() {
    const u = url.trim()
    if (!u) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const resp = await fetch('./api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || `HTTP ${resp.status}`)
      }
      const data = await resp.json()
      setResult(data)
      setActiveTab('colors')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function exportJSON() {
    if (!result) return
    const { screenshot, ...exportData } = result
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `design-tokens-${new URL(result.url).hostname}.json`
    a.click()
  }

  const tabs = [
    { id: 'colors', label: 'Colors', icon: <Palette size={14} />, count: result?.colors.length },
    { id: 'typography', label: 'Typography', icon: <Type size={14} />, count: result?.typography.length },
    { id: 'spacing', label: 'Spacing', icon: <Ruler size={14} />, count: result?.spacing.length },
    { id: 'radii', label: 'Radii', icon: <Circle size={14} />, count: result?.radii.length },
    { id: 'shadows', label: 'Shadows', icon: <Layers size={14} />, count: result?.shadows.length },
    { id: 'custom', label: 'Custom Props', icon: <Code2 size={14} />, count: result?.customProperties.length },
    ...(result?.screenshot ? [{ id: 'screenshot', label: 'Screenshot', icon: <Camera size={14} />, count: undefined }] : []),
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🎨</span>
            <h1 className="text-lg font-semibold text-text">Design Extract</h1>
          </div>
          <p className="text-sm text-text-muted">Reverse-engineer any website's design system. Paste a URL, get structured tokens.</p>
        </div>
      </header>

      {/* URL Input */}
      <div className="px-4 md:px-8 py-6 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && extract()}
                placeholder="https://example.com"
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors font-mono"
                disabled={loading}
              />
            </div>
            <button
              onClick={extract}
              disabled={loading || !url.trim()}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Extracting...
                </>
              ) : (
                'Extract'
              )}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-4 md:px-8 py-20 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-accent mb-4" />
          <p className="text-sm text-text-muted">Launching headless browser, loading page, extracting styles...</p>
          <p className="text-xs text-text-muted mt-1">This usually takes 10-20 seconds</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
          {/* Result header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-text">{result.title}</h2>
              <p className="text-xs text-text-muted mt-0.5 font-mono">{result.url} — {result.meta.elementsScanned} elements scanned</p>
            </div>
            <button
              onClick={exportJSON}
              className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border rounded-lg text-xs text-text-muted hover:text-text hover:border-border-hover transition-colors"
            >
              <Download size={13} />
              Export JSON
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent/15 text-accent border border-accent/20'
                    : 'text-text-muted hover:text-text hover:bg-surface-2'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-[10px] opacity-60">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-[400px]">
            {activeTab === 'colors' && <ColorsPanel colors={result.colors} />}
            {activeTab === 'typography' && <TypographyPanel typography={result.typography} />}
            {activeTab === 'spacing' && <SpacingPanel spacing={result.spacing} />}
            {activeTab === 'radii' && <RadiiPanel radii={result.radii} />}
            {activeTab === 'shadows' && <ShadowsPanel shadows={result.shadows} />}
            {activeTab === 'custom' && <CustomPropsPanel props={result.customProperties} />}
            {activeTab === 'screenshot' && result.screenshot && <ScreenshotPanel src={result.screenshot} />}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="px-4 md:px-8 py-20 text-center">
          <div className="text-4xl mb-4">🎨</div>
          <p className="text-text-muted text-sm mb-2">Paste any URL to extract its design language</p>
          <p className="text-text-muted text-xs">Colors, typography, spacing, radii, shadows, CSS custom properties</p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['stripe.com', 'linear.app', 'vercel.com', 'github.com'].map(site => (
              <button
                key={site}
                onClick={() => { setUrl(`https://${site}`); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-surface-2 border border-border text-text-muted hover:text-text hover:border-border-hover transition-colors font-mono"
              >
                {site}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-text-muted hover:text-text transition-colors p-1"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  )
}

function ColorsPanel({ colors }: { colors: ColorToken[] }) {
  if (!colors.length) return <Empty label="No colors extracted" />

  const backgrounds = colors.filter(c => c.usage === 'background')
  const texts = colors.filter(c => c.usage === 'text')
  const borders = colors.filter(c => c.usage === 'border')

  return (
    <div className="space-y-8">
      {[
        { label: 'Background Colors', items: backgrounds },
        { label: 'Text Colors', items: texts },
        { label: 'Border Colors', items: borders },
      ].filter(g => g.items.length > 0).map(group => (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{group.label}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {group.items.map((color, i) => (
              <div key={i} className="bg-surface-2 border border-border rounded-xl overflow-hidden group">
                <div className="h-16" style={{ backgroundColor: color.hex }} />
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-medium">{color.hex}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{color.count} uses</p>
                  </div>
                  <CopyButton text={color.hex} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* All colors flat */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">All Colors</h3>
        <div className="flex flex-wrap gap-2">
          {colors.map((color, i) => (
            <div
              key={i}
              className="group relative w-10 h-10 rounded-lg border border-border cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: color.hex }}
              title={`${color.hex} (${color.count} uses, ${color.usage})`}
              onClick={() => navigator.clipboard.writeText(color.hex)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TypographyPanel({ typography }: { typography: TypographyToken[] }) {
  if (!typography.length) return <Empty label="No typography extracted" />

  const families = [...new Set(typography.map(t => t.family))]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Font Families ({families.length})</h3>
        <div className="flex flex-wrap gap-2">
          {families.map(f => (
            <div key={f} className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-lg">
              <span className="text-sm" style={{ fontFamily: f }}>{f}</span>
              <CopyButton text={f} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Type Scale</h3>
        <div className="space-y-3">
          {typography.map((t, i) => (
            <div key={i} className="bg-surface-2 border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate text-text leading-tight"
                    style={{
                      fontFamily: t.fullFamily,
                      fontSize: t.size,
                      fontWeight: Number(t.weight),
                    }}
                  >
                    {t.sample || 'Sample text'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-mono text-text">{t.size} / {t.weight}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {t.tag} — line-height: {t.lineHeight}
                  </p>
                  <p className="text-[10px] text-text-muted">{t.count} occurrences</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpacingPanel({ spacing }: { spacing: SpacingToken[] }) {
  if (!spacing.length) return <Empty label="No spacing values extracted" />

  const maxPx = Math.max(...spacing.map(s => s.px || 0), 1)

  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Spacing Scale</h3>
      <div className="space-y-2">
        {spacing.map((s, i) => (
          <div key={i} className="flex items-center gap-4 group">
            <div className="w-16 shrink-0 text-right">
              <span className="text-xs font-mono text-text">{s.value}</span>
            </div>
            <div className="flex-1">
              <div
                className="h-6 rounded bg-accent/20 border border-accent/30 transition-all"
                style={{ width: `${Math.max(((s.px || 0) / maxPx) * 100, 2)}%` }}
              />
            </div>
            <div className="w-20 shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-text-muted">{s.count}x</span>
              <CopyButton text={s.value} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RadiiPanel({ radii }: { radii: RadiusToken[] }) {
  if (!radii.length) return <Empty label="No border radii extracted" />
  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Border Radii</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {radii.map((r, i) => (
          <div key={i} className="bg-surface-2 border border-border rounded-xl p-4 text-center">
            <div
              className="w-16 h-16 mx-auto mb-3 border-2 border-accent/40 bg-accent/10"
              style={{ borderRadius: r.value }}
            />
            <p className="text-xs font-mono">{r.value}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{r.count} uses</p>
            <CopyButton text={r.value} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ShadowsPanel({ shadows }: { shadows: ShadowToken[] }) {
  if (!shadows.length) return <Empty label="No shadows extracted" />
  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Shadows</h3>
      <div className="space-y-3">
        {shadows.map((s, i) => (
          <div key={i} className="bg-surface-2 border border-border rounded-xl p-4 flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-lg bg-surface-3 shrink-0"
              style={{ [s.type === 'box' ? 'boxShadow' : 'textShadow']: s.value }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono truncate text-text">{s.value}</p>
              <p className="text-[10px] text-text-muted mt-1">{s.type} shadow — {s.count} uses</p>
            </div>
            <CopyButton text={s.value} />
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomPropsPanel({ props }: { props: CustomProp[] }) {
  if (!props.length) return <Empty label="No CSS custom properties found" />
  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">CSS Custom Properties</h3>
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-text-muted font-medium">Property</th>
              <th className="text-left px-4 py-2.5 text-text-muted font-medium">Value</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {props.map((p, i) => {
              const isColor = /^#|^rgb|^hsl/.test(p.value)
              return (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-3/50">
                  <td className="px-4 py-2.5 font-mono text-accent">{p.name}</td>
                  <td className="px-4 py-2.5 font-mono flex items-center gap-2">
                    {isColor && (
                      <span className="inline-block w-3 h-3 rounded-sm border border-border shrink-0" style={{ backgroundColor: p.value }} />
                    )}
                    {p.value}
                  </td>
                  <td className="px-2"><CopyButton text={`${p.name}: ${p.value}`} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScreenshotPanel({ src }: { src: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Page Screenshot</h3>
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <img src={`data:image/png;base64,${src}`} alt="Page screenshot" className="w-full" />
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-text-muted text-center py-12">{label}</p>
}

export default App
