import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getPartida, confirmarPresenca, cancelarPresenca,
    fecharListaEGerarTimes, liberarAvaliacao, encerrarAvaliacao,
} from "../services/partidas";
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
type EquipeAdminResumo = { id: number };

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
            setMeuId(euRes.data?.id ?? null);

            const d = await getPartida(partidaId);
            setData(d);

            try {
                const [admRes, memRes] = await Promise.all([
                    api.get<EquipeAdminResumo[]>("/eu/equipes-administrador"),
                    api.get<EquipeAdminResumo[]>("/eu/equipes"),
                ]);
                const admLista = admRes.data ?? [];
                const memLista = memRes.data ?? [];
                const isAdmin = admLista.some((e) => Number(e.id) === d.equipeId);
                const isMembro = memLista.some((e) => Number(e.id) === d.equipeId);
                setSouAdminDaEquipe(isAdmin);
                setSouMembroDaEquipe(isAdmin || isMembro);
            } catch {
                const fallback = (euRes.data?.id ?? null) === d.criadoPorUsuarioId;
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
                                <div className="x-when-time">⏰ {when.time} · Partida #{data.id}</div>
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
                    <div className="x-stats x-stagger" style={{ marginBottom: 32 }}>
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

                    {/* CTA presença */}
                    <div className="x-card" style={{ marginBottom: 24 }}>
                        <div className="x-card-title">
                            Minha presença
                            <span className="x-pill">{minhaPresenca ? minhaPresenca.statusPresenca : "—"}</span>
                        </div>
                        <p className="x-card-sub">Confirme ou cancele enquanto a partida estiver ABERTA.</p>
                        <hr className="x-divider" />
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button className="x-btn" onClick={onConfirmar} disabled={!podeConfirmar || acting}>
                                {acting ? "..." : "Confirmar presença"}
                            </button>
                            <button className="x-btn ghost" onClick={onCancelar} disabled={!podeCancelar || acting}>
                                {acting ? "..." : "Cancelar"}
                            </button>
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

                                {souAdminDaEquipe && listaFechada && (
                                    <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                                        <button className="x-btn" onClick={onLiberarAvaliacao} disabled={liberandoAvaliacao}>
                                            {liberandoAvaliacao ? "..." : "Liberar avaliação"}
                                        </button>
                                    </div>
                                )}
                                {avaliacaoLiberada && (
                                    <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                        {souMembroDaEquipe && (
                                            <button className="x-btn" onClick={() => nav(`/partidas/${data.id}/avaliar`)}>
                                                Avaliar agora <span className="x-btn-arr">→</span>
                                            </button>
                                        )}
                                        {souAdminDaEquipe && (
                                            <button className="x-btn ghost" onClick={onEncerrarAvaliacao} disabled={encerrandoAvaliacao}>
                                                {encerrandoAvaliacao ? "..." : "Encerrar avaliação"}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div>
                                <p className="x-meta" style={{ marginBottom: 20 }}>
                                    Os times ainda não foram gerados.
                                </p>
                                {souAdminDaEquipe ? (
                                    <button className="x-btn" onClick={onFecharListaEGerarTimes} disabled={!partidaAberta || generating}>
                                        {generating ? "..." : "Fechar lista e gerar times"}
                                    </button>
                                ) : (
                                    <p className="x-meta">Apenas administradores podem fechar a lista e gerar times.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
