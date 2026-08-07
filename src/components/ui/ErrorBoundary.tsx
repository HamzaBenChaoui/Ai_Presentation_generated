import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../../lib/cn'

interface ErrorBoundaryProps {
  children: ReactNode
  className?: string
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-4 rounded-xl border border-danger/30 bg-danger/5 p-8 text-center',
            this.props.className,
          )}
        >
          <div className="rounded-full bg-danger/10 p-3 text-danger">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-lg font-semibold text-text">Something went wrong</h3>
          <p className="max-w-sm text-sm text-text-muted">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <Button variant="outline" onClick={this.handleRetry}>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
