import type { QuickStart, PresentationTheme, RecentPresentation, Feature } from '../types'

export const QUICK_STARTS: QuickStart[] = [
  {
    label: 'Startup Pitch',
    prompt: 'Create a compelling startup pitch presentation that showcases our innovative solution, market opportunity, and business model to potential investors.',
  },
  {
    label: 'Business Review',
    prompt: 'Generate a comprehensive quarterly business review covering key metrics, achievements, challenges, and strategic goals for the next period.',
  },
  {
    label: 'Conference Talk',
    prompt: 'Design an inspiring conference talk presentation that tells a powerful story and delivers actionable insights that can change perspectives.',
  },
  {
    label: 'Product Launch',
    prompt: 'Create an exciting product launch presentation highlighting features, benefits, and go-to-market strategy for our new innovation.',
  },
  {
    label: 'Research Report',
    prompt: 'Build a detailed research report presentation with findings, methodology, analysis, and actionable recommendations.',
  },
  {
    label: 'Course Intro',
    prompt: 'Develop an engaging course introduction that outlines learning objectives, curriculum structure, and expected outcomes for students.',
  },
]

export const PRESENTATION_THEMES: PresentationTheme[] = [
  { name: 'Void',    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
  { name: 'Bright',  gradient: 'linear-gradient(135deg, #f8f9ff 0%, #e8eaf6 100%)' },
  { name: 'Ocean',   gradient: 'linear-gradient(135deg, #0d3b66 0%, #1b6ca8 100%)' },
  { name: 'Sunset',  gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7c59f 100%)' },
  { name: 'Forest',  gradient: 'linear-gradient(135deg, #1a3c34 0%, #2d6a4f 100%)' },
]

export const SLIDE_COUNTS = ['5', '10', '15', '20']
export const TONES = ['Professional', 'Creative', 'Academic', 'Casual', 'Persuasive']
export const LANGUAGES = ['English', 'French', 'Spanish', 'Arabic', 'German']

export const LOADING_STEPS = [
  'Analyzing your content requirements',
  'Generating slide structure and flow',
  'Creating visual designs and layouts',
  'Optimizing content for impact',
  'Finalizing your presentation',
]

export const RECENT_PRESENTATIONS: RecentPresentation[] = [
  {
    title: 'Startup Pitch — Series A',
    gradient: 'linear-gradient(135deg, #7c6aff 0%, #a89fff 100%)',
    slides: 12,
    time: '2 hours ago',
  },
  {
    title: 'Q3 Business Review',
    gradient: 'linear-gradient(135deg, #0d3b66 0%, #1b6ca8 100%)',
    slides: 8,
    time: 'Yesterday',
  },
  {
    title: 'Sustainability Report 2025',
    gradient: 'linear-gradient(135deg, #1a3c34 0%, #2d6a4f 100%)',
    slides: 15,
    time: '3 days ago',
  },
]

export const FEATURES: Feature[] = [
  {
    icon: 'bolt',
    title: 'Instant Generation',
    description: 'Full deck in under 30 seconds',
  },
  {
    icon: 'palette',
    title: 'Beautiful Themes',
    description: '5 curated styles, fully customizable',
  },
  {
    icon: 'pencil',
    title: 'Fully Editable',
    description: 'Every slide is yours to tweak',
  },
  {
    icon: 'export',
    title: 'Export Anywhere',
    description: 'PPTX, PDF, or live share link',
  },
]

export const NAV_LINKS = ['Templates', 'My Slides', 'Pricing', 'Docs']
