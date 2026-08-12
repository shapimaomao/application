import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AccessGuard from './components/AccessGuard.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">应用加载时发生错误</h2>
            <p className="text-sm text-slate-600 mb-4">系统检测到未捕获的运行时异常，请尝试刷新页面。</p>
            <pre className="text-xs bg-slate-100 p-3 rounded-lg text-rose-600 overflow-x-auto text-left mb-6 font-mono">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl transition"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return (this.props as Props).children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AccessGuard>
        <App />
      </AccessGuard>
    </ErrorBoundary>
  </React.StrictMode>
);

