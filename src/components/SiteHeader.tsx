import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, clearToken } from "../utils/auth";

const LINKS = [
    { path: "/", label: "Início" },
    { path: "/beneficios", label: "Benefícios" },
    { path: "/modalidades", label: "Modalidades" },
    { path: "/como-funciona", label: "Como funciona" },
];

export default function SiteHeader() {
    const nav = useNavigate();
    const loc = useLocation();
    const [open, setOpen] = useState(false);
    const { logged } = useAuth();

    function go(path: string) {
        setOpen(false);
        nav(path);
    }

    function handleLogout() {
        clearToken();
        setOpen(false);
        nav("/");
    }

    return (
        <header className="x-nav">
            <div className="x-nav-inner">
                <button className="x-brand" onClick={() => nav("/")} aria-label="Início">
                    <span className="x-brand-mark">
                        <img src="/icon-bola.png" alt="" />
                    </span>
                    <span className="x-brand-name">ClubeDoFut</span>
                </button>

                <nav className="x-nav-links" aria-label="Navegação principal">
                    {LINKS.map((l) => (
                        <button
                            key={l.path}
                            className={`x-nav-link ${loc.pathname === l.path ? "active" : ""}`}
                            onClick={() => nav(l.path)}
                        >
                            {l.label}
                        </button>
                    ))}
                </nav>

                <div className="x-nav-actions">
                    {logged ? (
                        <>
                            <button className="x-btn ghost sm" onClick={handleLogout}>Sair</button>
                            <button className="x-btn sm" onClick={() => nav("/eu")}>
                                Meu perfil <span className="x-btn-arr">→</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="x-btn ghost sm" onClick={() => nav("/login")}>Entrar</button>
                            <button className="x-btn sm" onClick={() => nav("/register")}>
                                Criar conta <span className="x-btn-arr">→</span>
                            </button>
                        </>
                    )}
                </div>

                <button
                    className={`x-hamb ${open ? "open" : ""}`}
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Menu"
                >
                    <span /><span /><span />
                </button>
            </div>

            <div className={`x-mob-menu ${open ? "open" : ""}`}>
                {LINKS.map((l) => (
                    <button
                        key={l.path}
                        className={`x-mob-link ${loc.pathname === l.path ? "active" : ""}`}
                        onClick={() => go(l.path)}
                    >
                        {l.label}
                    </button>
                ))}
                <div className="x-mob-actions">
                    {logged ? (
                        <>
                            <button className="x-btn ghost block" onClick={handleLogout}>Sair</button>
                            <button className="x-btn block" onClick={() => go("/eu")}>Meu perfil</button>
                        </>
                    ) : (
                        <>
                            <button className="x-btn ghost block" onClick={() => go("/login")}>Entrar</button>
                            <button className="x-btn block" onClick={() => go("/register")}>Criar conta</button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
