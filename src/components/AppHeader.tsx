import { useNavigate, useLocation } from "react-router-dom";
import { clearToken } from "../utils/auth";

type Props = {
    onLogout?: () => void;
};

export default function AppHeader({ onLogout }: Props) {
    const nav = useNavigate();
    const loc = useLocation();
    const path = loc.pathname;

    const isEquipes = path === "/equipes" || path.startsWith("/equipes");
    const isEu = path === "/eu";

    function handleLogout() {
        if (onLogout) return onLogout();
        clearToken();
        nav("/");
    }

    return (
        <header className="x-app-header">
            <div className="x-app-header-inner">
                <button className="x-brand" onClick={() => nav("/equipes")}>
                    <span className="x-brand-mark">
                        <img src="/icon-bola.png" alt="" />
                    </span>
                    <span className="x-brand-name">ClubeDoFut</span>
                </button>

                <nav className="x-app-nav">
                    <button
                        className={`x-app-nav-link ${isEquipes ? "active" : ""}`}
                        onClick={() => nav("/equipes")}
                    >
                        Equipes
                    </button>
                    <button
                        className={`x-app-nav-link ${isEu ? "active" : ""}`}
                        onClick={() => nav("/eu")}
                    >
                        Perfil
                    </button>
                </nav>

                <div className="x-app-actions">
                    <button
                        className="x-app-iconlink"
                        onClick={() => nav("/eu")}
                        aria-label="Perfil"
                        title="Perfil"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </button>
                    <button
                        className="x-btn ghost sm x-app-logout"
                        onClick={handleLogout}
                        title="Sair"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span className="x-app-logout-label">Sair</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
