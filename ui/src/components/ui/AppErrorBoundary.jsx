import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Application render failed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="admin-page" role="alert">
          <section className="admin-shell">
            <h1>Something went wrong</h1>
            <p>The page could not be displayed. Reload to try again.</p>
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error.message}</pre>
            </details>
            <button className="btn" onClick={() => window.location.reload()} type="button">
              Reload page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
