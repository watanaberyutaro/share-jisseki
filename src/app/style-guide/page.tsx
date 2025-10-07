'use client'

import { MagneticDots } from '@/components/MagneticDots'

export default function StyleGuidePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', paddingTop: '80px' }}>
      <MagneticDots />
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center pt-8">
          <h1 style={{ color: 'var(--text-primary)' }} className="text-4xl font-bold mb-4">
            Happy Hues Palette #14
          </h1>
          <p style={{ color: 'var(--text-secondary)' }} className="text-lg">
            カラートークンとUIコンポーネントのスタイルガイド
          </p>
        </div>

        {/* Color Swatches */}
        <section>
          <h2 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mb-6">
            カラートークン
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Background */}
            <div className="text-center">
              <div
                className="w-full h-24 rounded-xl border mb-3 flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
              >
                <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">Background</span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }} className="text-sm">
                <div className="font-mono text-xs">#fffffe</div>
                <div>--bg</div>
              </div>
            </div>

            {/* Accent */}
            <div className="text-center">
              <div
                className="w-full h-24 rounded-xl border mb-3 flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--border)' }}
              >
                <span style={{ color: 'var(--on-accent)' }} className="text-sm font-medium">Accent</span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }} className="text-sm">
                <div className="font-mono text-xs">#ffd803</div>
                <div>--accent</div>
              </div>
            </div>

            {/* Surface Soft */}
            <div className="text-center">
              <div
                className="w-full h-24 rounded-xl border mb-3 flex items-center justify-center"
                style={{ backgroundColor: 'var(--surface-soft)', borderColor: 'var(--border)' }}
              >
                <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">Surface Soft</span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }} className="text-sm">
                <div className="font-mono text-xs">#e3f6f5</div>
                <div>--surface-soft</div>
              </div>
            </div>

            {/* Surface Muted */}
            <div className="text-center">
              <div
                className="w-full h-24 rounded-xl border mb-3 flex items-center justify-center"
                style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border)' }}
              >
                <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">Surface Muted</span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }} className="text-sm">
                <div className="font-mono text-xs">#bae8e8</div>
                <div>--surface-muted</div>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mb-6">
            タイポグラフィ
          </h2>
          <div className="space-y-4">
            <div>
              <h1 style={{ color: 'var(--text-primary)' }} className="text-4xl font-bold">
                見出し1 (H1) - Primary Text
              </h1>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)' }} className="text-base">
                本文テキスト - Secondary Text。この色は読みやすさを保ちながら、見出しとの階層を作ります。
              </p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mb-6">
            ボタン
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              className="px-6 py-3 rounded-xl font-medium transition-all focus-ring hover:opacity-90"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--on-accent)'
              }}
            >
              Primary Button
            </button>

            <button
              className="px-6 py-3 rounded-xl font-medium border transition-all focus-ring hover:opacity-90"
              style={{
                backgroundColor: 'var(--surface-soft)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border)'
              }}
            >
              Secondary Button
            </button>
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mb-6">
            カード
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="p-6 rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--border)'
              }}
            >
              <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-bold mb-2">
                基本カード
              </h3>
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                背景色に --bg を使用した基本的なカードです。
              </p>
            </div>

            <div
              className="p-6 rounded-2xl border"
              style={{
                backgroundColor: 'var(--surface-soft)',
                borderColor: 'var(--border)'
              }}
            >
              <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-bold mb-2">
                ソフトサーフェスカード
              </h3>
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                背景色に --surface-soft を使用したカードです。
              </p>
            </div>
          </div>
        </section>

        {/* Usage Example */}
        <section>
          <h2 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mb-6">
            使用例
          </h2>
          <div className="bg-gray-100 p-4 rounded-xl">
            <pre className="text-sm text-gray-800">
{`/* CSS Custom Properties */
background-color: var(--bg);
color: var(--text-primary);
border-color: var(--border);

/* Tailwind Classes */
class="bg-hue-bg text-hue-text-primary"
class="bg-hue-accent text-hue-accent-foreground"`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  )
}