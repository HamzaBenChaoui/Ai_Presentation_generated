import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 40, textAlign: 'center', color: '#ff6b81' }}>
          <h3 style={{ marginBottom: 8 }}>Something went wrong</h3>
          <p style={{ fontSize: 14, opacity: 0.7 }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid #ff6b81', background: 'transparent', color: '#ff6b81', cursor: 'pointer', fontSize: 14 }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
