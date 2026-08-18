import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class Vitni2ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Vitni 2] renderer crashed', error, info);
  }

  private switchToLegacy = () => {
    window.localStorage.setItem('vitni.ui', 'legacy');
    const url = new URL(window.location.href);
    url.searchParams.delete('ui');
    window.location.href = url.toString();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-8 text-slate-100">
        <div className="w-full max-w-2xl rounded-xl border border-red-400/30 bg-slate-900 p-6 shadow-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Vitni 2 failed to render</p>
          <h1 className="mb-3 text-xl font-semibold">The new interface hit a renderer error.</h1>
          <p className="mb-4 text-sm text-slate-300">The case data has not been deleted. The error is shown here so the migration fails visibly instead of leaving a blank window.</p>
          <pre className="mb-5 max-h-64 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-red-200">{this.state.error.message}</pre>
          <button type="button" className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950" onClick={this.switchToLegacy}>
            Switch to legacy UI
          </button>
        </div>
      </div>
    );
  }
}
