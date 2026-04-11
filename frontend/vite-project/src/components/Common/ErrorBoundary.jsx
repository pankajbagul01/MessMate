import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback } = this.props;
    if (fallback) return fallback;

    return (
      <div className="eb-container">
        <div className="eb-card">
          <div className="eb-icon">⚠️</div>
          <h2 className="eb-title">Something went wrong</h2>
          <p className="eb-message">
            This page ran into an unexpected error. Your bookings and data are safe.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="eb-details">
              <summary>Error details</summary>
              <pre>{this.state.error.toString()}</pre>
            </details>
          )}
          <div className="eb-actions">
            <button className="eb-btn-secondary" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <button className="eb-btn-primary" onClick={this.handleReset}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;