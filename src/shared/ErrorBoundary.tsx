import { Component, type ReactNode } from 'react';
import { Box } from 'lucide-react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error: String(error) };
  }
  render() {
    return this.state.error ? (
      <main className="restore-screen" aria-label="Workspace recovery">
        <Box size={38} />
        <h1>The workspace hit a snag.</h1>
        <p>Your saved projects are still in this browser.</p>
        <pre>{this.state.error}</pre>
        <button className="primary-button" onClick={() => window.location.reload()}>
          Reload workspace
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
