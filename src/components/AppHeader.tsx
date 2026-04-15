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

                <div className="x-nav-actions">
                    <button className="x-btn ghost sm" onClick={handleLogout}>Sair</button>
                </div>
            </div>
        </header>
    );
}
