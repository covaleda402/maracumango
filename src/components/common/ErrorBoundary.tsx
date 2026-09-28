import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Ha ocurrido un error inesperado al renderizar la vista.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('⚠️ [Maracumango ErrorBoundary]:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-surface">
          <div className="w-full max-w-md p-6 rounded-3xl bg-surface-container-lowest border border-error/20 shadow-xl text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-error-container/20 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">
                {this.props.fallbackTitle || 'Algo no salió como esperábamos'}
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                La aplicación detectó un problema en este componente y evitó una pantalla en blanco.
              </p>
            </div>
            {this.state.errorMessage && (
              <div className="p-3 rounded-xl bg-surface-container text-xs text-on-surface-variant font-mono text-left overflow-x-auto max-h-24">
                {this.state.errorMessage}
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors"
              >
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
