import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clearToken } from "../utils/auth";
import { listarConvites } from "../services/convites";
import { isNotImplemented } from "../utils/errors";

type Props = {
    onLogout?: () => void;
};

export default function AppHeader({ onLogout }: Props) {
    const nav = useNavigate();
    const loc = useLocation();
    const path = loc.pathname;

    const [pendentes, setPendentes] = useState<number>(0);
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const btnRef = useRef<HTMLButtonElement | null>(null);

    // Poll convites pendentes a cada 60s (silencioso se endpoint não existir)
    useEffect(() => {
        let alive = true;
        async function check() {
            try {
                const list = await listarConvites();
                if (!alive) return;
                setPendentes(list.filter((c) => c.status === "PENDENTE").length);
            } catch (e: any) {
                if (!isNotImplemented(e)) {
                    // erro real — não polui UI, só não atualiza badge
                }
            }
        }
        check();
        const t = setInterval(check, 60_000);
        return () => { alive = false; clearInterval(t); };
    }, [path]);

    // Fecha o menu ao mudar de rota
    useEffect(() => { setOpen(false); }, [path]);

    // Fecha clicando fora ou ESC
    useEffect(() => {
        if (!open) return;
        function handleClick(ev: MouseEvent) {
            const t = ev.target as Node;
            if (menuRef.current?.contains(t)) return;
            if (btnRef.current?.contains(t)) return;
            setOpen(false);
        }
        function handleKey(ev: KeyboardEvent) {
            if (ev.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    function handleLogout() {
        setOpen(false);
        if (onLogout) return onLogout();
        clearToken();
        nav("/");
    }

    function go(to: string) {
        setOpen(false);
        nav(to);
    }

    const items: Array<{
        to?: string;
        label: string;
        icon: React.ReactNode;
        badge?: number;
        onClick?: () => void;
        danger?: boolean;
        active?: boolean;
    }> = [
        {
            to: "/equipes",
            label: "Equipes",
            active: path === "/equipes" || path.startsWith("/equipes"),
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="7" r="4" />
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
        },
        {
            to: "/estatisticas",
            label: "Estatísticas",
            active: path === "/estatisticas",
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="M7 15l4-4 3 3 5-6" />
                </svg>
            ),
        },
        {
            to: "/convites",
            label: "Convites",
            active: path === "/convites",
            badge: pendentes,
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                </svg>
            ),
        },
        {
            to: "/eu",
            label: "Perfil",
            active: path === "/eu",
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
        },
        {
            label: "Sair",
            onClick: handleLogout,
            danger: true,
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
            ),
        },
    ];

    return (
        <header className="x-app-header">
            <div className="x-app-header-inner">
                {/* Brand serve como link "home" → /equipes */}
                <button className="x-brand" onClick={() => go("/equipes")} aria-label="Ir para equipes">
                    <span className="x-brand-mark">
                        <img src="/icon-bola.png" alt="" />
                    </span>
                    <span className="x-brand-name">ClubeDoFut</span>
                </button>

                <div style={{ flex: 1 }} />

                <div className="x-burger-wrap">
                    <button
                        ref={btnRef}
                        className={`x-burger ${open ? "is-open" : ""}`}
                        onClick={() => setOpen((v) => !v)}
                        aria-label="Abrir menu"
                        aria-expanded={open}
                        aria-haspopup="menu"
                    >
                        <span className="x-burger-bar" />
                        <span className="x-burger-bar" />
                        <span className="x-burger-bar" />
                        {pendentes > 0 && <span className="x-nav-badge floating">{pendentes}</span>}
                    </button>

                    {open && (
                        <div ref={menuRef} className="x-burger-menu" role="menu">
                            {items.map((it) => (
                                <button
                                    key={it.label}
                                    role="menuitem"
                                    className={`x-burger-item ${it.active ? "active" : ""} ${it.danger ? "danger" : ""}`}
                                    onClick={() => (it.onClick ? it.onClick() : it.to && go(it.to))}
                                >
                                    <span className="x-burger-item-ic">{it.icon}</span>
                                    <span className="x-burger-item-lbl">{it.label}</span>
                                    {typeof it.badge === "number" && it.badge > 0 && (
                                        <span className="x-nav-badge">{it.badge}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
