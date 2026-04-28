import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import CountUp from "../components/CountUp";
import UserAvatar from "../components/UserAvatar";
import UserDetalheModal from "../components/UserDetalheModal";
import { toast } from "../components/Toast";
import { explainError, isAuthError, isNotImplemented } from "../utils/errors";
import { getEstatisticas, type Estatisticas as Stats } from "../services/estatisticas";

export default function EstatisticasPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Stats | null>(null);
    const [notImplemented, setNotImplemented] = useState(false);
    const [userDetalhe, setUserDetalhe] = useState<{ usuarioId: number; nome: string; fotoPerfil?: string | null } | null>(null);

    async function load() {
        setLoading(true);
        try {
            const s = await getEstatisticas();
            setData(s);
            setNotImplemented(false);
        } catch (e: any) {
            if (isAuthError(e)) return;
            if (isNotImplemented(e)) {
                setNotImplemented(true);
                return;
            }
            toast.error(explainError(e), "Falha ao carregar estatísticas");
        } finally { setLoading(false); }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    return (
        <div className="x-app">
            <AppHeader />

            <main className="x-app-main">
                <div className="x-app-container">
                    <div className="x-page-head">
                        <div>
                            <h1 className="x-page-title">Estatísticas</h1>
                            <p className="x-page-sub">
                                Seu desempenho, histórico e ranking dentro do clube.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="x-loading"><div className="x-spinner" /> Carregando...</div>
                    ) : notImplemented ? (
                        <div className="x-empty">
                            <div className="x-empty-icon">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 3v18h18" />
                                    <path d="M7 15l4-4 3 3 5-6" />
                                </svg>
                            </div>
                            <h3 className="x-empty-title">Em breve</h3>
                            <p className="x-empty-text">
                                A tela de estatísticas está em desenvolvimento. Em breve você vai
                                conseguir acompanhar seu desempenho, ranking e histórico de partidas por aqui.
                            </p>
                        </div>
                    ) : data ? (
                        <>
                            <div className="x-stats x-stagger" style={{ marginBottom: 32 }}>
                                <div className="x-stat x-reveal">
                                    <div className="x-stat-lbl">Partidas jogadas</div>
                                    <div className="x-stat-val"><CountUp to={data.totalPartidas ?? 0} /></div>
                                </div>
                                <div className="x-stat x-reveal">
                                    <div className="x-stat-lbl">Nota atual</div>
                                    <div className="x-stat-val">
                                        {data.notaAtual != null
                                            ? <CountUp to={data.notaAtual} decimals={1} />
                                            : "—"}
                                    </div>
                                </div>
                                <div className="x-stat x-reveal">
                                    <div className="x-stat-lbl">Média recebida</div>
                                    <div className="x-stat-val">
                                        {data.mediaNotasRecebidas != null
                                            ? <CountUp to={data.mediaNotasRecebidas} decimals={1} />
                                            : "—"}
                                    </div>
                                </div>
                            </div>

                            {/* Últimas partidas */}
                            <div className="x-card" style={{ marginBottom: 24 }}>
                                <div className="x-card-title">
                                    Últimas partidas
                                    <span className="x-pill">{data.ultimasPartidas?.length ?? 0}</span>
                                </div>
                                <hr className="x-divider" />
                                {!data.ultimasPartidas?.length ? (
                                    <p className="x-meta">Nenhuma partida encerrada ainda.</p>
                                ) : (
                                    <div className="x-list">
                                        {data.ultimasPartidas.map((p) => (
                                            <div key={p.partidaId} className="x-row">
                                                <div className="x-avatar sm">
                                                    {p.foiMvp ? (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD24A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M7 4h10v5a5 5 0 1 1-10 0V4z" fill="#FFD24A" fillOpacity="0.2" />
                                                            <path d="M12 17v4M8 21h8M17 4h3v2a3 3 0 0 1-3 3M7 4H4v2a3 3 0 0 0 3 3" />
                                                        </svg>
                                                    ) : "★"}
                                                </div>
                                                <div className="x-row-main">
                                                    <div className="x-row-name">
                                                        {new Date(p.dataHora).toLocaleString("pt-BR")}
                                                        {p.foiMvp && (
                                                            <span className="x-row-me" style={{ background: "rgba(255,210,74,0.16)", color: "#FFD24A", borderColor: "rgba(255,210,74,0.35)" }}>
                                                                MVP
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="x-row-meta">
                                                        <span className="x-pill">
                                                            {p.notaRecebida != null ? `★ ${Number(p.notaRecebida).toFixed(1)}` : "sem nota"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Parceiros frequentes */}
                            {data.parceirosFrequentes?.length > 0 && (
                                <div className="x-card">
                                    <div className="x-card-title">
                                        Parceiros frequentes
                                        <span className="x-pill">{data.parceirosFrequentes.length}</span>
                                    </div>
                                    <hr className="x-divider" />
                                    <div className="x-list">
                                        {data.parceirosFrequentes.map((p) => (
                                            <div key={p.usuarioId} className="x-row">
                                                <UserAvatar nome={p.nome} fotoPerfil={p.fotoPerfil} size="sm" />
                                                <div className="x-row-main">
                                                    <div className="x-row-name">{p.nome}</div>
                                                    <div className="x-row-meta">
                                                        <span className="x-pill">
                                                            {p.totalPartidasJuntos} partida{p.totalPartidasJuntos !== 1 ? "s" : ""} junto{p.totalPartidasJuntos !== 1 ? "s" : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="x-row-actions">
                                                    <button
                                                        className="x-btn ghost sm"
                                                        onClick={() => setUserDetalhe({ usuarioId: p.usuarioId, nome: p.nome, fotoPerfil: p.fotoPerfil })}
                                                        title="Ver detalhes"
                                                    >
                                                        Detalhes
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </main>

            {userDetalhe && (
                <UserDetalheModal
                    usuarioId={userDetalhe.usuarioId}
                    nome={userDetalhe.nome}
                    fotoPerfil={userDetalhe.fotoPerfil}
                    onClose={() => setUserDetalhe(null)}
                />
            )}
        </div>
    );
}
