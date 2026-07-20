import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { templatesApi, type TemplateInfo } from '../../lib/api'

interface Props {
  onSelect: (template: TemplateInfo) => void
  suggested?: string | null
}

export default function TemplatePicker({ onSelect, suggested }: Props) {
  const { colors } = useTheme()
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [selected, setSelected] = useState<string | null>(suggested || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    templatesApi
      .list()
      .then(data => {
        setTemplates(data.templates)
        if (suggested) {
          const match = data.templates.find(t => t.name === suggested)
          if (match) setSelected(match.name)
        }
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [suggested])

  const handleSelect = (template: TemplateInfo) => {
    setSelected(template.name)
    onSelect(template)
  }

  if (loading) {
    return <div style={{ color: colors.textMuted, fontSize: '12px', padding: 8 }}>Loading templates...</div>
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {templates.map(template => (
        <button
          key={template.name}
          onClick={() => handleSelect(template)}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: `1px solid ${selected === template.name ? colors.accent : colors.border}`,
            background: selected === template.name ? `${colors.accent}22` : 'transparent',
            color: colors.text,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
          }}
          title={template.description}
        >
          {template.name.replace(/_/g, ' ')}
          {template.slides.length > 0 && (
            <span style={{ marginLeft: 4, opacity: 0.6, fontWeight: 400 }}>({template.slides.length} slides)</span>
          )}
        </button>
      ))}
    </div>
  )
}
