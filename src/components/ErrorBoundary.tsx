import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-8 text-red-400 text-center">
            <h2 className="font-bold text-xl mb-2">Something went wrong</h2>
            <p className="text-sm mb-4">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-sidebar-active text-white rounded-app cursor-pointer"
            >
              Retry
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
