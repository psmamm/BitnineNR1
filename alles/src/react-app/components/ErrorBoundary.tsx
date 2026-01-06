import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0D0F18] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-[#1E2232] rounded-2xl p-8 border border-white/5 text-center">
                        <div className="w-16 h-16 bg-[#E74C3C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-[#E74C3C]" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h2>
                        <p className="text-[#AAB0C0] mb-6">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-6 py-3 rounded-xl font-semibold transition-all"
                        >
                            Reload Page
                        </button>
                        {this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="text-[#7F8C8D] text-sm cursor-pointer hover:text-white">
                                    Error details
                                </summary>
                                <pre className="mt-2 text-xs text-[#E74C3C] bg-[#0D0F18] p-3 rounded overflow-auto">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
