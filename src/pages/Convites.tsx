import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { toast } from "../components/Toast";
import { explainError, isAuthError, isNotImplemented } from "../utils/errors";
import {
    listarConvites, aceitarConvite, recusarConvite,
    type Convite,
} from "../services/convites";

export default function Convites() {
    const nav = useNavigate();
    const [loading, setLoading] = useState(true);
    const [convites, setConvites] = useState<Convite[]>([]);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [notImplemented, setNotImplemented] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const list = await listarConvites();
            setConvites(list);
            setNotImplemented(false);
        } catch (e: any) {
            if (isAuthError(e)) return;
            if (isNotImplemented(e)) {
                setNotImplemented(true);
                return;
            }
            toast.error(explainError(e), "Falha ao carregar convites");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    const pendentes = useMemo(() => convites.filter((c) => c.status === "PENDENTE"), [convites]);
    const historico = useMemo(() => convites.filter((c) => c.status !== "PENDENTE"), [convites]);

    async function handleAceitar(c: Convite) {
        setBusyId(c.id);
        try {
            await aceitarConvite(c.id);
            toast.success(`Você entrou em "${c.equipeNome ?? "equipe"}"!`);
            await load();
            if (c.equipeId) nav(`/equipes/${c.equipeId}`);
        } catch (e: any) {
            if (!isAuthError(e)) toast.error(explainError(e), "Falha ao aceitar");
        } finally { setBusyId(null); }
    }

    async function handleRecusar(c: Convite) {
        setBusyId(c.id);
        try {
            await recusarConvite(c.id);
            toast.info("Convite recusado.");
            await load();
        } catch (e: any) {
            if (!isAuthError(e)) toast.error(explainError(e), "Falha ao recusar");
        } finally { setBusyId(null); }
    }

    return (
        <div className="x-app">
            <AppHeader />

            <main className="x-app-main">
                <div className="x-app-narrow">
                    <div className="x-page-head">
                        <div>
                            <h1 className="x-page-title">Convites</h1>
                            <p className="x-page-sub">
                                Equipes que te chamaram pra participar. Aceite ou recuse.
                            </p>
                        </div>
                        {pendentes.length > 0 && (
                            <span className="x-pill accent">{pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""}</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="x-loading"><div className="x-spinner" /> Carregando convites...</div>
                    ) : notImplemented ? (
                        <div className="x-empty">
                            <div className="x-empty-icon">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <h3 className="x-empty-title">Em breve</h3>
                            <p className="x-empty-text">
                                O fluxo de convites ainda está em implementação. Por enquanto,
                                entre em uma equipe aberta pela busca ou use a senha numa equipe fechada.
                            </p>
                            <button className="x-btn sm" onClick={() => nav("/equipes")}>
                                Descobrir equipes <span className="x-btn-arr">→</span>
                            </button>
                        </div>
                    ) : convites.length === 0 ? (
                        <div className="x-empty">
                            <div className="x-empty-icon">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                            <h3 className="x-empty-title">Nenhum convite</h3>
                            <p className="x-empty-text">
                                Quando alguém te convidar pra uma equipe, aparece aqui.
                            </p>
                            <button className="x-btn sm" onClick={() => nav("/equipes")}>
                                Descobrir equipes <span className="x-btn-arr">→</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            {pendentes.length > 0 && (
                                <div style={{ marginBottom: 36 }}>
                                    <h2 className="x-h3" style={{ marginBottom: 16 }}>Pendentes</h2>
                                    <div className="x-list">
                                        {pendentes.map((c) => (
                                            <div key={c.id} className="x-row">
                                                <div className="x-avatar sm">
                                                    {(c.equipeNome ?? "?").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="x-row-main">
                                                    <div className="x-row-name">
                                                        {c.equipeNome ?? "Equipe"}
                                                    </div>
                                                    <div className="x-row-meta">
                                                        {c.remetenteNome && (
                                                            <span className="x-pill">Por {c.remetenteNome}</span>
                                                        )}
                                                        <span className="x-pill accent">Pendente</span>
                                                    </div>
                                                </div>
                                                <div className="x-row-actions">
                                                    <button
                                                        className="x-btn sm"
                                                        onClick={() => handleAceitar(c)}
                                                        disabled={busyId === c.id}
                                                    >
                                                        {busyId === c.id ? "..." : "Aceitar"}
                                                    </button>
                                                    <button
                                                        className="x-btn ghost sm"
                                                        onClick={() => handleRecusar(c)}
                                                        disabled={busyId === c.id}
                                                    >
                                                        Recusar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {historico.length > 0 && (
                                <div>
                                    <h2 className="x-h3" style={{ marginBottom: 16 }}>Histórico</h2>
                                    <div className="x-list">
                                        {historico.map((c) => (
                                            <div key={c.id} className="x-row dim">
                                                <div className="x-avatar sm">
                                                    {(c.equipeNome ?? "?").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="x-row-main">
                                                    <div className="x-row-name">{c.equipeNome ?? "Equipe"}</div>
                                                    <div className="x-row-meta">
                                                        <span className={`x-pill ${c.status === "ACEITO" ? "success" : ""}`}>
                                                            {c.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
