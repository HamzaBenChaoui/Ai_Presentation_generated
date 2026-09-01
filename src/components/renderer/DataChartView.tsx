import Chart from 'chart.js/auto'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import type { ChartDataset } from '../../types'
import type { RenderTokens } from './theme'

// Native chart element renderer (bar / line / pie / doughnut / radar) with
// real multi-series support — the editor's chart element, AI-emitted charts
// and imported PPTX charts all land here. Styled from the deck tokens like
// ChartView; the entrance animation replays when the slide reactivates.

export type DataChartKind = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar'

interface Props {
  chartType?: DataChartKind
  labels?: string[]
  datasets?: ChartDataset[]
  tokens: RenderTokens
  active?: boolean
}

const PALETTE_SLOTS = 6

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

export default function DataChartView({ chartType = 'bar', labels, datasets, tokens, active = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const prefersReduced = useReducedMotion()

  const cleanLabels = useMemo(
    () => (labels ?? []).map((l) => String(l ?? '')),
    [labels],
  )
  const cleanDatasets = useMemo(
    () => (datasets ?? []).map((d) => ({
      label: String(d.label || ''),
      data: (d.data ?? []).map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0)),
    })).filter((d) => d.data.length > 0),
    [datasets],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !cleanDatasets.length) return

    const textColor = tokens.textMuted
    const gridColor = hexToRgba(tokens.text.startsWith('#') ? tokens.text : '#888888', 0.12)
    const palette = [tokens.accent, tokens.accent2, tokens.accent3, tokens.text, tokens.surface2, tokens.bg]

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
    }
    const entrance = prefersReduced ? false : { duration: 900, easing: 'easeOutQuart' as const }

    const data = {
      labels: cleanLabels,
      datasets: cleanDatasets.map((d, i) => {
        const color = palette[i % PALETTE_SLOTS]
        if (chartType === 'pie' || chartType === 'doughnut') {
          return {
            label: d.label,
            data: d.data,
            backgroundColor: cleanLabels.map((_, k) => palette[k % PALETTE_SLOTS]),
            borderWidth: 2,
            borderColor: tokens.bg,
            hoverOffset: 6,
          }
        }
        if (chartType === 'radar') {
          return {
            label: d.label,
            data: d.data,
            borderColor: color,
            backgroundColor: hexToRgba(color, 0.18),
            borderWidth: 2,
            pointBackgroundColor: color,
            pointRadius: 3,
          }
        }
        if (chartType === 'line') {
          return {
            label: d.label,
            data: d.data,
            borderColor: color,
            borderWidth: 2,
            fill: cleanDatasets.length === 1,
            backgroundColor: hexToRgba(color, 0.16),
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: color,
          }
        }
        return {
          label: d.label,
          data: d.data,
          backgroundColor: hexToRgba(color, 0.92),
          hoverBackgroundColor: color,
          borderRadius: 8,
          maxBarThickness: 52,
        }
      }),
    }

    let chart: Chart
    if (chartType === 'pie' || chartType === 'doughnut') {
      chart = new Chart(canvas, {
        type: chartType,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: entrance,
          ...(chartType === 'doughnut' ? { cutout: '62%' } : {}),
          plugins: {
            legend: {
              position: 'right',
              labels: { color: textColor, boxWidth: 10, boxHeight: 10, font: { size: 11 } },
            },
            tooltip,
          },
        },
      })
    } else if (chartType === 'radar') {
      chart = new Chart(canvas, {
        type: 'radar',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: entrance,
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor, boxWidth: 10, font: { size: 11 } } },
            tooltip,
          },
          scales: {
            r: {
              angleLines: { color: gridColor },
              grid: { color: gridColor },
              pointLabels: { color: textColor, font: { size: 10 } },
              ticks: { display: false },
            },
          },
        },
      })
    } else {
      chart = new Chart(canvas, {
        type: chartType,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: entrance,
          plugins: {
            legend: cleanDatasets.length > 1
              ? { position: 'bottom', labels: { color: textColor, boxWidth: 10, font: { size: 11 } } }
              : { display: false },
            tooltip,
          },
          scales: { x: axis, y: { ...axis, beginAtZero: true } },
        },
      })
    }

    chartRef.current = chart
    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [cleanLabels, cleanDatasets, chartType, tokens, prefersReduced])

  // Replay the entrance whenever the slide becomes active again.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !active || prefersReduced) return
    chart.reset()
    chart.update()
  }, [active, prefersReduced])

  if (!cleanDatasets.length) {
    return (
      <div
        style={{
          height: '100%',
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tokens.textMuted,
          fontSize: 13,
          fontStyle: 'italic',
          border: `1px dashed ${tokens.border}`,
          borderRadius: 8,
        }}
      >
        Chart — no data yet
      </div>
    )
  }
  return <canvas ref={canvasRef} aria-label="chart" />
}
