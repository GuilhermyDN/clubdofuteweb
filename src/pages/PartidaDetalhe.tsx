import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getPartida, confirmarPresenca, cancelarPresenca,
    fecharListaEGerarTimes, liberarAvaliacao, encerrarAvaliacao,
} from "../services/partidas";
import { getEquipe } from "../services/equipe";
import { api } from "../services/api";
import AppHeader from "../components/AppHeader";
import CountUp from "../components/CountUp";
import { toast } from "../components/Toast";
import { explainError, isAuthError } from "../utils/errors";

type Presenca = { usuarioId: number; nome: string; statusPresenca: "CONFIRMADO" | "CANCELADO" | string; };
type TimeJogador = { usuarioId: number; nome: string; nota: number; };
type TimeGerado = { numero: number; jogadores: TimeJogador[]; };
type TimesGerados = { id: number; partidaId: number; times: TimeGerado[]; reservas: TimeJogador[]; geradoEm: string; };
type PartidaDetalhe = {
    id: number;
    equipeId: number;
    dataHora: string;
    statusPartida: "ABERTA" | "LISTA_FECHADA" | "AVALIACAO_LIBERADA" | "ENCERRADA" | string;
    politicaInscricao: "SOMENTE_MEMBROS" | "AVULSOS_ABERTOS" | string;
    jogadoresPorTime: number;
    limiteParticipantes: number | null;
    criadoPorUsuarioId: number;
    criadoEm: string;
    presencas: Presenca[];
    timesGerados: TimesGerados | null;
};

type EuResponse = { id: number; nome?: string };

function cap(s: string) { return !s ? s : s.charAt(0).toUpperCase() + s.slice(1); }
function fmtDataHoraParts(iso?: string) {
    if (!iso) return { weekday: "—", date: "—", time: "—" };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { weekday: "—", date: "—", time: "—" };
    const weekday = cap(d.toLocaleDateString("pt-BR", { weekday: "long" }));
    const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return { weekday, date, time };
}
function fmtISO(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR");
}

export default function PartidaDetalhePage() {
    const nav = useNavigate();
    const { partidaId } = useParams();

    const [loading, setLoading] = useState(true);
    const [loadErr, setLoadErr] = useState<string | null>(null);
    const [data, setData] = useState<PartidaDetalhe | null>(null);

    const [souAdminDaEquipe, setSouAdminDaEquipe] = useState(false);
    const [souMembroDaEquipe, setSouMembroDaEquipe] = useState(false);
    const [meuId, setMeuId] = useState<number | null>(null);

    const [acting, setActing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [liberandoAvaliacao, setLiberandoAvaliacao] = useState(false);
    const [encerrandoAvaliacao, setEncerrandoAvaliacao] = useState(false);

    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    async function load() {
        if (!partidaId) { setLoadErr("ID de partida ausente."); return; }
        setLoadErr(null);
        setLoading(true);
        try {
            const euRes = await api.get<EuResponse>("/eu");
            const uid = euRes.data?.id ?? null;
            setMeuId(uid);

            const d = await getPartida(partidaId);
            setData(d);

            // Detecta admin/membro via /equipes/{id} (mais confiável que /eu/equipes-administrador)
            try {
                const equipe: any = await getEquipe(String(d.equipeId));
                const membros: any[] = equipe?.membros ?? [];
                const meu = uid != null ? membros.find((m) => m.usuarioId === uid) : null;
                const papel = String(meu?.papel ?? "").toUpperCase();
                const isAdmin = !!meu && meu.ativo !== false && (papel === "ADMIN" || papel === "ADMINISTRADOR");
                const isMembro = !!meu && meu.ativo !== false;
                setSouAdminDaEquipe(isAdmin);
                setSouMembroDaEquipe(isAdmin || isMembro);
            } catch {
                // fallback: se criou a partida, é admin da equipe
                const fallback = uid === d.criadoPorUsuarioId;
                setSouAdminDaEquipe(fallback);
                setSouMembroDaEquipe(fallback);
            }
            setPage((p) => Math.max(1, p));
        } catch (e: any) {
            if (isAuthError(e)) return;
            const msg = explainError(e);
            setLoadErr(msg);
            toast.error(msg, "Falha ao carregar partida");
        } finally { setLoading(false); }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [partidaId]);

    const when = useMemo(() => fmtDataHoraParts(data?.dataHora), [data?.dataHora]);
    const presencas = useMemo(() => data?.presencas ?? [], [data?.presencas]);
    const confirmados = useMemo(() => presencas.filter((p) => p.statusPresenca === "CONFIRMADO").length, [presencas]);

    const minhaPresenca = useMemo(() => {
        if (!meuId) return null;
        return presencas.find((p) => p.usuarioId === meuId) ?? null;
    }, [presencas, meuId]);

    const estouConfirmado = minhaPresenca?.statusPresenca === "CONFIRMADO";
    const limite = data?.limiteParticipantes ?? 0;
    const vagas = useMemo(() => (limite > 0 ? Math.max(0, limite - confirmados) : null), [limite, confirmados]);

    const partidaAberta = data?.statusPartida === "ABERTA";
    const listaFechada = data?.statusPartida === "LISTA_FECHADA";
    const avaliacaoLiberada = data?.statusPartida === "AVALIACAO_LIBERADA";
    const partidaEncerrada = data?.statusPartida === "ENCERRADA";

    const podeConfirmar = !!data && partidaAberta && !estouConfirmado && (limite === 0 || confirmados < limite);
    const podeCancelar = !!data && partidaAberta && estouConfirmado;

    const totalPresencas = presencas.length;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalPresencas / PAGE_SIZE)), [totalPresencas]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
        if (page < 1) setPage(1);
    }, [page, totalPages]);

    const pageStart = (page - 1) * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, totalPresencas);
    const presencasPaginadas = useMemo(() => presencas.slice(pageStart, pageEnd), [presencas, pageStart, pageEnd]);

    async function onConfirmar() {
        if (!partidaId) return;
        try { setActing(true); await confirmarPresenca(partidaId); toast.success("Presença confirmada."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao confirmar"); }
        finally { setActing(false); }
    }
    async function onCancelar() {
        if (!partidaId) return;
        try { setActing(true); await cancelarPresenca(partidaId); toast.success("Presença cancelada."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao cancelar"); }
        finally { setActing(false); }
    }
    async function onFecharListaEGerarTimes() {
        if (!partidaId) return;
        try { setGenerating(true); await fecharListaEGerarTimes(partidaId); toast.success("Lista fechada e times gerados."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao gerar times"); }
        finally { setGenerating(false); }
    }
    async function onLiberarAvaliacao() {
        if (!partidaId) return;
        try { setLiberandoAvaliacao(true); await liberarAvaliacao(partidaId); toast.success("Avaliação liberada."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao liberar avaliação"); }
        finally { setLiberandoAvaliacao(false); }
    }
    async function onEncerrarAvaliacao() {
        if (!partidaId) return;
        try { setEncerrandoAvaliacao(true); await encerrarAvaliacao(partidaId); toast.success("Avaliação encerrada."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao encerrar avaliação"); }
        finally { setEncerrandoAvaliacao(false); }
    }

    if (loading) {
        return (
            <div className="x-app">
                <AppHeader />
                <main className="x-app-main"><div className="x-loading"><div className="x-spinner" /> Carregando partida...</div></main>
            </div>
        );
    }

    if (loadErr && !data) {
        return (
            <div className="x-app">
                <AppHeader />
                <main className="x-app-main">
                    <div className="x-app-container">
                        <div className="x-empty">
                            <div className="x-empty-icon">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="13" />
                                    <line x1="12" y1="16" x2="12" y2="16.1" />
                                </svg>
                            </div>
                            <h3 className="x-empty-title">Não foi possível carregar</h3>
                            <p className="x-empty-text">{loadErr}</p>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button className="x-btn ghost sm" onClick={() => nav(-1)}>Voltar</button>
                                <button className="x-btn sm" onClick={load}>Tentar novamente</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="x-app">
            <AppHeader />

            <div className="x-phero">
                <div className="x-phero-inner">
                    <button className="x-phero-back" onClick={() => nav(-1)}>← Voltar</button>
                    <div className="x-phero-grid">
                        <div>
                            <div className="x-when">
                                <div className="x-when-day">{when.weekday}</div>
                                <div className="x-when-date">{when.date}</div>
                                <div className="x-when-time">⏰ {when.time}</div>
                            </div>
                            <div className="x-phero-meta">
                                <span className="x-pill">{data.statusPartida}</span>
                                <span className="x-pill">{data.politicaInscricao}</span>
                                {souAdminDaEquipe && <span className="x-pill accent">Admin</span>}
                                {!souAdminDaEquipe && souMembroDaEquipe && <span className="x-pill success">Membro</span>}
                            </div>
                        </div>
                        <div className="x-phero-actions">
                            <button className="x-btn ghost sm" onClick={load}>Recarregar</button>
                            <button className="x-btn ghost sm" onClick={() => nav(`/equipes/${data.equipeId}`)}>Ver equipe</button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="x-app-main">
                <div className="x-app-container">
                    <div className="x-stats x-stagger" style={{ marginBottom: 24 }}>
                        <div className="x-stat x-reveal">
                            <div className="x-stat-lbl">Confirmados</div>
                            <div className="x-stat-val"><em><CountUp to={confirmados} /></em></div>
                        </div>
                        <div className="x-stat x-reveal">
                            <div className="x-stat-lbl">Vagas</div>
                            <div className="x-stat-val">{vagas === null ? "—" : <CountUp to={vagas} />}</div>
                        </div>
                        <div className="x-stat x-reveal">
                            <div className="x-stat-lbl">Jogadores/Time</div>
                            <div className="x-stat-val"><CountUp to={data.jogadoresPorTime} /></div>
                        </div>
                        <div className="x-stat x-reveal">
                            <div className="x-stat-lbl">Limite</div>
                            <div className="x-stat-val">{data.limiteParticipantes ? <CountUp to={data.limiteParticipantes} /> : "∞"}</div>
                        </div>
                    </div>

                    {/* ═══ NEXT STEP BANNER (admin) ═══════════════════ */}
                    {souAdminDaEquipe && partidaAberta && !data.timesGerados && (
                        <div className="x-next-step">
                            <div className="x-next-step-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <polyline points="9 11 12 14 22 4" />
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                </svg>
                            </div>
                            <div className="x-next-step-body">
                                <div className="x-next-step-label">Próximo passo</div>
                                <h3 className="x-next-step-title">Fechar lista & gerar times</h3>
                                <div className="x-next-step-desc">
                                    Quando todos estiverem confirmados, feche a lista pra sortear os times nivelados.
                                </div>
                            </div>
                            <div className="x-next-step-actions">
                                <button className="x-btn" onClick={onFecharListaEGerarTimes} disabled={generating}>
                                    {generating ? "Gerando..." : "Fechar e gerar"}
                                    <span className="x-btn-arr">→</span>
                                </button>
                            </div>
                        </div>
                    )}
                    {souAdminDaEquipe && listaFechada && data.timesGerados && (
                        <div className="x-next-step">
                            <div className="x-next-step-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                            </div>
                            <div className="x-next-step-body">
                                <div className="x-next-step-label">Próximo passo</div>
                                <h3 className="x-next-step-title">Liberar avaliação</h3>
                                <div className="x-next-step-desc">
                                    Times já sorteados. Libere pros jogadores avaliarem o equilíbrio dos times.
                                </div>
                            </div>
                            <div className="x-next-step-actions">
                                <button className="x-btn" onClick={onLiberarAvaliacao} disabled={liberandoAvaliacao}>
                                    {liberandoAvaliacao ? "Liberando..." : "Liberar avaliação"}
                                    <span className="x-btn-arr">→</span>
                                </button>
                            </div>
                        </div>
                    )}
                    {avaliacaoLiberada && (
                        <div className="x-next-step">
                            <div className="x-next-step-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                            </div>
                            <div className="x-next-step-body">
                                <div className="x-next-step-label">
                                    {souMembroDaEquipe ? "Sua vez" : "Avaliação em andamento"}
                                </div>
                                <h3 className="x-next-step-title">
                                    {souMembroDaEquipe ? "Avaliar os times" : "Aguardando notas"}
                                </h3>
                                <div className="x-next-step-desc">
                                    {souMembroDaEquipe
                                        ? "Dê uma nota pra cada time. Quando todos terminarem, o admin encerra."
                                        : "Os jogadores estão enviando as notas. O admin pode encerrar quando quiser."}
                                </div>
                            </div>
                            <div className="x-next-step-actions">
                                {souMembroDaEquipe && (
                                    <button className="x-btn" onClick={() => nav(`/partidas/${data.id}/avaliar`)}>
                                        Avaliar agora <span className="x-btn-arr">→</span>
                                    </button>
                                )}
                                {souAdminDaEquipe && (
                                    <button className="x-btn ghost" onClick={onEncerrarAvaliacao} disabled={encerrandoAvaliacao}>
                                        {encerrandoAvaliacao ? "Encerrando..." : "Encerrar avaliação"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {partidaEncerrada && (
                        <div className="x-next-step" style={{ background: "rgba(255, 255, 255, 0.03)", borderColor: "var(--x-border-2)" }}>
                            <div className="x-next-step-icon" style={{ color: "var(--x-success)", borderColor: "var(--x-success)" }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <div className="x-next-step-body">
                                <div className="x-next-step-label" style={{ color: "var(--x-success)" }}>Partida concluída</div>
                                <h3 className="x-next-step-title">Avaliação encerrada</h3>
                                <div className="x-next-step-desc">
                                    As notas foram registradas e vão calibrar os próximos sorteios. Valeu por jogar!
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CTA presença */}
                    <div className="x-card" style={{ marginBottom: 24 }}>
                        <div className="x-card-title">
                            Minha presença
                            {minhaPresenca?.statusPresenca === "CONFIRMADO" && (
                                <span className="x-pill success">Confirmado</span>
                            )}
                            {minhaPresenca?.statusPresenca === "CANCELADO" && (
                                <span className="x-pill">Cancelado</span>
                            )}
                            {!minhaPresenca && <span className="x-pill">Pendente</span>}
                        </div>
                        <p className="x-card-sub">
                            {partidaAberta
                                ? estouConfirmado
                                    ? "Você está confirmado. Pode cancelar a qualquer momento enquanto a lista estiver aberta."
                                    : "Confirme sua presença pra entrar na lista da partida."
                                : "A lista já foi fechada — não é mais possível alterar sua presença."}
                        </p>
                        <hr className="x-divider" />
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {!estouConfirmado ? (
                                <button className="x-btn" onClick={onConfirmar} disabled={!podeConfirmar || acting}>
                                    {acting ? "..." : "Confirmar presença"}
                                    <span className="x-btn-arr">→</span>
                                </button>
                            ) : (
                                <button className="x-btn danger" onClick={onCancelar} disabled={!podeCancelar || acting}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                    {acting ? "Cancelando..." : "Cancelar minha presença"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Lista de presenças */}
                    <div className="x-card" style={{ marginBottom: 24 }}>
                        <div className="x-card-title">
                            Presenças
                            <span className="x-pill">{totalPresencas}</span>
                        </div>
                        <hr className="x-divider" />

                        {totalPresencas === 0 ? (
                            <p className="x-meta">Sem presenças ainda.</p>
                        ) : (
                            <div className="x-list">
                                {presencasPaginadas.map((p) => {
                                    const isMe = meuId === p.usuarioId;
                                    const isOk = p.statusPresenca === "CONFIRMADO";
                                    return (
                                        <div key={p.usuarioId} className={`x-row ${isOk ? "" : "dim"}`}>
                                            <div className="x-avatar sm">
                                                {String(p.nome || "?").trim().charAt(0).toUpperCase()}
                                            </div>
                                            <div className="x-row-main">
                                                <div className="x-row-name">
                                                    {p.nome}
                                                    {isMe && <span className="x-row-me">você</span>}
                                                </div>
                                                <div className="x-row-meta">
                                                    <span className={`x-pill ${isOk ? "success" : ""}`}>{p.statusPresenca}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {totalPresencas > PAGE_SIZE && (
                            <div className="x-pager">
                                <div className="x-pager-info">
                                    <b>{pageStart + 1}</b>–<b>{pageEnd}</b> de <b>{totalPresencas}</b>
                                </div>
                                <div className="x-pager-btns">
                                    <button className="x-btn ghost sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</button>
                                    <span className="x-meta" style={{ padding: "0 8px" }}>{page} / {totalPages}</span>
                                    <button className="x-btn ghost sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Times / Avaliação */}
                    <div className="x-card">
                        <div className="x-card-title">
                            Times
                            <span className="x-pill">{data.timesGerados ? "Gerados" : "Pendente"}</span>
                        </div>
                        <hr className="x-divider" />

                        {data.timesGerados ? (
                            <>
                                <p className="x-card-sub" style={{ marginBottom: 20 }}>
                                    Gerado em <b>{fmtISO(data.timesGerados.geradoEm)}</b>
                                </p>
                                <div className="x-teams-grid">
                                    {data.timesGerados.times.map((t) => (
                                        <div className="x-team-card" key={t.numero}>
                                            <div className="x-team-card-title">
                                                Time {t.numero}
                                                <span className="x-pill accent">{t.jogadores.length}</span>
                                            </div>
                                            <div className="x-team-roster">
                                                {t.jogadores.map((j) => (
                                                    <div className="x-team-player" key={j.usuarioId}>
                                                        <span className="x-team-player-name">{j.nome}</span>
                                                        <span className="x-team-player-nota">{j.nota}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="x-team-card">
                                        <div className="x-team-card-title">
                                            Reservas
                                            <span className="x-pill">{data.timesGerados.reservas.length}</span>
                                        </div>
                                        <div className="x-team-roster">
                                            {data.timesGerados.reservas.length === 0 ? (
                                                <p className="x-meta">Sem reservas.</p>
                                            ) : (
                                                data.timesGerados.reservas.map((r) => (
                                                    <div className="x-team-player" key={r.usuarioId}>
                                                        <span className="x-team-player-name">{r.nome}</span>
                                                        <span className="x-team-player-nota">{r.nota}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </>
                        ) : (
                            <div className="x-empty" style={{ padding: 32 }}>
                                <div className="x-empty-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                </div>
                                <p className="x-empty-text">
                                    {souAdminDaEquipe
                                        ? "Aguardando lista fechar. Use o botão acima quando estiver pronto."
                                        : "Os times serão gerados quando o administrador fechar a lista."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
