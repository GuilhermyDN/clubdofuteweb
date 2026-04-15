import { Component, type ReactNode, type ErrorInfo } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // log to console; poderia mandar pra um serviço de telemetria aqui
        console.error("[ErrorBoundary]", error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleHome = () => {
        window.location.assign("/");
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="x-crash">
                    <div className="x-crash-card">
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                margin: "0 auto 18px",
                                borderRadius: 10,
                                background: "var(--x-danger-soft)",
                                color: "var(--x-danger)",
                                display: "grid",
                                placeItems: "center",
                                border: "1px solid rgba(255, 71, 111, 0.3)",
                            }}
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="13" />
                                <line x1="12" y1="16" x2="12" y2="16.1" />
                            </svg>
                        </div>
                        <h2>Algo deu errado</h2>
                        <p>
                            A aplicação encontrou um erro inesperado. Tente recarregar a página
                            ou volte pro início.
                        </p>
                        {this.state.error && (
                            <pre className="x-crash-detail">{this.state.error.message}</pre>
                        )}
                        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                            <button className="x-btn" onClick={this.handleReload}>
                                Recarregar
                            </button>
                            <button className="x-btn ghost" onClick={this.handleHome}>
                                Voltar ao início
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
