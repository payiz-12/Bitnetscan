import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 my-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-lg w-full text-center space-y-5 shadow-lg animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                {this.props.fallbackTitle || 'An Unexpected Error Occurred'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                A component encountered a temporary issue while loading. Refreshing the view or returning home will restore normal operation.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono text-[11px] text-slate-700 max-h-28 overflow-y-auto">
                <span className="font-bold text-rose-600 block mb-0.5">Error Details:</span>
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = '/';
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>

              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
