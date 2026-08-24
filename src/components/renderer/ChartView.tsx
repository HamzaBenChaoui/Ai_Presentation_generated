import Chart from 'chart.js/auto'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import type { RenderTokens } from './theme'

// Real charts via Chart.js — replaces the old CSS-only bars. The AI's
// statistics items become a live, hoverable, animated chart themed from the
// deck tokens (gradient fills, soft grids, styled tooltips).
//
// Variant is auto-picked when omitted: 2 items → doughnut, many numeric items →
// line, otherwise bar. The entrance animation replays whenever `active` flips
// back on so fullscreen navigation always feels alive.

export type ChartVariant = 'bar' | 'line' | 'doughnut'

interface Props {
  items: { value: string; label: string }[]
  tokens: RenderTokens
  variant?: ChartVariant
  active?: boolean
}

function parseValue(raw: string): number {
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function pickVariant(items: Props['items']): ChartVariant {
  if (items.length === 2) return 'doughnut'
  const numeric = items.filter((i) => parseValue(i.value) > 0).length
  if (items.length >= 5 && numeric >= items.length / 2) return 'line'
  return 'bar'
}

function hexToRgba(hex: string, a: number): string {
  try {
    const clean = hex.replace('#', '')
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
    const int = parseInt(full, 16)
    if (Number.isNaN(int)) return hex
    return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${a})`
  } catch {
    return hex
  }
}

export default function ChartView({ items, tokens, variant, active = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const prefersReduced = useReducedMotion()
  const kind = variant ?? pickVariant(items)

  const labels = useMemo(() => items.map((i) => i.label), [items])
  const values = useMemo(() => items.map((i) => parseValue(i.value)), [items])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !items.length) return

    const textColor = tokens.textMuted
    const gridColor = hexToRgba(tokens.text.startsWith('#') ? tokens.text : '#888888', 0.12)
    const accent = tokens.accent
    const accent2 = tokens.accent2

    // Vertical accent2→accent gradient sized to the plot area. Chart.js calls
    // this once layout is known; before that we fall back to a flat accent.
    const gradientFill = (chart: Chart, fallbackAlpha: number): string | CanvasGradient => {
      const area = chart.chartArea
      if (!area) return hexToRgba(accent, fallbackAlpha)
      const g = chart.ctx.createLinearGradient(0, area.bottom, 0, area.top)
      g.addColorStop(0, hexToRgba(accent2, fallbackAlpha))
      g.addColorStop(1, hexToRgba(accent, 1))
      return g
    }

    const axis = {
      ticks: { color: textColor, font: { size: 10 }, maxRotation: 0, autoSkip: true },
      border: { display: false as const },
      grid: { color: gridColor },
    }
    const tooltip = {
      backgroundColor: 'rgba(0,0,0,0.82)',
      titleFont: { size: 11 },
      bodyFont: { size: 11 },
      padding: 8,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        // Prefer the model's original text ("$48B") over the parsed number.
        label: (ctx: { dataIndex: number }) => items[ctx.dataIndex]?.value ?? '',
      },
    }

    let chart: Chart
    if (kind === 'doughnut') {
      chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: items.map((_, i) => [accent, accent2, tokens.accent3, tokens.text][i % 4]),
              borderWidth: 2,
              borderColor: tokens.bg,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: prefersReduced ? false : { duration: 900, easing: 'easeOutQuart' },
          cutout: '62%',
          plugins: {
            legend: {
              position: 'right',
              labels: { color: textColor, boxWidth: 10, boxHeight: 10, font: { size: 11 } },
            },
            tooltip,
          },
        },
      })
    } else if (kind === 'line') {
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              data: values,
              borderColor: accent,
              borderWidth: 2,
              backgroundColor: (ctx) => gradientFill(ctx.chart, 0.22),
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: accent2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: prefersReduced ? false : { duration: 900, easing: 'easeOutQuart' },
          plugins: { legend: { display: false }, tooltip },
          scales: { x: axis, y: { ...axis, beginAtZero: true } },
        },
      })
    } else {
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: (ctx) => gradientFill(ctx.chart, 0.95),
              hoverBackgroundColor: accent,
              borderRadius: 8,
              maxBarThickness: 52,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: prefersReduced ? false : { duration: 900, easing: 'easeOutQuart' },
          plugins: { legend: { display: false }, tooltip },
          scales: { x: axis, y: { ...axis, beginAtZero: true } },
        },
      })
    }

    chartRef.current = chart
    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [labels, values, items, kind, tokens, prefersReduced])

  // Replay the entrance whenever the slide becomes active again.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !active || prefersReduced) return
    chart.reset()
    chart.update()
  }, [active, prefersReduced])

  if (!items.length) return null
  return <canvas ref={canvasRef} aria-label="chart" />
}
