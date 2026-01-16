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

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#1B1B1D] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-[#1B1B1D] rounded-2xl p-8 border border-white/5 text-center">
                        <div className="w-16 h-16 bg-[#F43F5E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-[#F43F5E]" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h2>
                        <p className="text-[#AAB0C0] mb-6">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-[#03AAC7] hover:bg-[#26BFD4] text-white px-6 py-3 rounded-xl font-semibold transition-all"
                        >
                            Reload Page
                        </button>
                        {this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="text-[#7F8C8D] text-sm cursor-pointer hover:text-white">
                                    Error details
                                </summary>
                                <pre className="mt-2 text-xs text-[#F43F5E] bg-[#1B1B1D] p-3 rounded overflow-auto">
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








