import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { getPartida, enviarAvaliacoesTimes } from "../services/partidas";
import AppHeader from "../components/AppHeader";
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

function clampInt(n: number, min: number, max: number) { return Math.max(min, Math.min(max, Math.round(n))); }
function sentKey(partidaId: string | number, meuId: number) { return `avaliacao_enviada_partida_${String(partidaId)}_user_${String(meuId)}`; }
function fmtDataHora(iso?: string) {
    if (!iso) return { dia: "—", hora: "—" };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { dia: "—", hora: "—" };
    const dia = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return { dia, hora };
}

export default function PartidaAvaliacaoPage() {
    const nav = useNavigate();
    const { partidaId } = useParams();

    const [loading, setLoading] = useState(true);
    const [gateErr, setGateErr] = useState<string | null>(null);
    const [data, setData] = useState<PartidaDetalhe | null>(null);
    const [meuId, setMeuId] = useState<number | null>(null);

    const [jaEnviouAvaliacao, setJaEnviouAvaliacao] = useState(false);
    const [notasPorTime, setNotasPorTime] = useState<Record<string, number>>({});
    const [sending, setSending] = useState(false);
    const [tab, setTab] = useState<string>("");

    async function loadPartida() {
        if (!partidaId) { setGateErr("ID de partida ausente."); return; }
        setGateErr(null);
        setLoading(true);
        try {
            const euRes = await api.get<EuResponse>("/eu");
            const uid = euRes.data?.id ?? null;
            setMeuId(uid);
            const d = await getPartida(partidaId);
            setData(d);

            let g: string | null = null;
            if (d.statusPartida !== "AVALIACAO_LIBERADA") {
                g = `Avaliação ainda não foi liberada pelo administrador (status: ${d.statusPartida}).`;
            }
            const timesGerados = d.timesGerados?.times ?? [];
            if (!g && (!d.timesGerados || timesGerados.length === 0)) {
                g = "Os times ainda não foram gerados para esta partida.";
            }
            if (!g && uid) {
                const minha = (d.presencas ?? []).find((p) => p.usuarioId === uid);
                if (!minha || minha.statusPresenca !== "CONFIRMADO") {
                    g = "Você precisa estar confirmado nesta partida para poder avaliar.";
                }
            }
            if (uid) {
                const key = sentKey(partidaId, uid);
                setJaEnviouAvaliacao(localStorage.getItem(key) === "1");
            } else { setJaEnviouAvaliacao(false); }
            setGateErr(g);
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha ao carregar avaliação");
        } finally { setLoading(false); }
    }

    useEffect(() => { loadPartida(); /* eslint-disable-next-line */ }, [partidaId]);

    const { dia, hora } = useMemo(() => fmtDataHora(data?.dataHora), [data?.dataHora]);

    const times = useMemo(() => {
        const list = data?.timesGerados?.times ?? [];
        return list.map((t) => ({ numero: t.numero, alvoId: `TIME_${t.numero}`, jogadores: t.jogadores ?? [] }));
    }, [data?.timesGerados]);

    useEffect(() => {
        if (!tab && times.length > 0) setTab(times[0].alvoId);
    }, [tab, times]);

    const timeSelecionado = useMemo(() => times.find((t) => t.alvoId === tab) ?? null, [times, tab]);
    const notaLocal = tab ? (notasPorTime[tab] ?? 0) : 0;

    function setNotaTime(alvoId: string, n: number) {
        if (jaEnviouAvaliacao) return;
        setNotasPorTime((prev) => ({ ...prev, [alvoId]: clampInt(n, 0, 10) }));
    }

    const faltandoTimes = useMemo(() => {
        const missing: { alvoId: string; numero: number }[] = [];
        for (const t of times) {
            const has = Object.prototype.hasOwnProperty.call(notasPorTime, t.alvoId);
            if (!has) missing.push({ alvoId: t.alvoId, numero: t.numero });
        }
        return missing;
    }, [times, notasPorTime]);

    const podeInteragir = !!data && !gateErr && !jaEnviouAvaliacao;
    const podeEnviar = podeInteragir && !sending && faltandoTimes.length === 0 && data?.statusPartida === "AVALIACAO_LIBERADA";

    async function onEnviar() {
        if (!partidaId) return;
        if (jaEnviouAvaliacao) { toast.warn("Você já enviou sua avaliação."); return; }
        if (!data) { toast.warn("Partida não carregada."); return; }
        if (data.statusPartida !== "AVALIACAO_LIBERADA") { toast.warn(`Avaliação não liberada (status: ${data.statusPartida}).`); return; }
        if (!data.timesGerados || times.length === 0) { toast.warn("Times ainda não foram gerados."); return; }
        if (faltandoTimes.length > 0) {
            toast.warn(`Faltou avaliar: ${faltandoTimes.map((t) => `Time ${t.numero}`).join(", ")}`);
            return;
        }

        const payload = times.map((t) => ({
            tipoAlvo: "TIME" as const,
            alvoId: t.alvoId,
            nota: clampInt(notasPorTime[t.alvoId], 0, 10),
        }));

        try {
            setSending(true);
            await enviarAvaliacoesTimes(partidaId, payload);
            toast.success("Avaliação enviada. Obrigado!", "Pronto");
            if (meuId != null) {
                localStorage.setItem(sentKey(partidaId, meuId), "1");
                setJaEnviouAvaliacao(true);
            }
        } catch (e: any) {
            if (!isAuthError(e)) toast.error(explainError(e), "Falha ao enviar avaliação");
        }
        finally { setSending(false); }
    }

    function onLimpar() {
        if (sending || jaEnviouAvaliacao) return;
        setNotasPorTime({});
        if (times.length > 0) setTab(times[0].alvoId);
    }

    if (loading) {
        return (
            <div className="x-app">
                <AppHeader />
                <main className="x-app-main"><div className="x-loading"><div className="x-spinner" /> Carregando avaliação...</div></main>
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
                            <div className="x-eyebrow">Avaliar times</div>
                            <h1 className="x-phero-title" style={{ marginTop: 12 }}>
                                {dia}
                            </h1>
                            <div className="x-meta" style={{ marginBottom: 18 }}>Horário: {hora}</div>
                            <div className="x-phero-meta">
                                <span className="x-pill">{data.statusPartida}</span>
                                <span className="x-pill">{data.politicaInscricao}</span>
                                {jaEnviouAvaliacao ? (
                                    <span className="x-pill warning">Enviado (bloqueado)</span>
                                ) : (
                                    <span className="x-pill success">Envio único</span>
                                )}
                            </div>
                        </div>
                        <div className="x-phero-actions">
                            <button className="x-btn ghost sm" onClick={loadPartida}>Recarregar</button>
                            <button className="x-btn ghost sm" onClick={() => nav(`/partidas/${data.id}`)}>Ver partida</button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="x-app-main">
                <div className="x-app-container">
                    {gateErr && (
                        <div className="x-alert warn">
                            <div>
                                <span className="x-alert-title">Avaliação indisponível</span>
                                <span className="x-alert-text">{gateErr}</span>
                            </div>
                        </div>
                    )}

                    {jaEnviouAvaliacao && (
                        <div className="x-alert ok">
                            <div>
                                <span className="x-alert-title">Avaliação enviada</span>
                                <span className="x-alert-text">
                                    Você já enviou sua avaliação. As notas ficam bloqueadas neste dispositivo.
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="x-stats" style={{ marginBottom: 32 }}>
                        <div className="x-stat">
                            <div className="x-stat-lbl">Times</div>
                            <div className="x-stat-val">{times.length}</div>
                        </div>
                        <div className="x-stat">
                            <div className="x-stat-lbl">Avaliados</div>
                            <div className="x-stat-val"><em>{times.length - faltandoTimes.length}</em></div>
                        </div>
                        <div className="x-stat">
                            <div className="x-stat-lbl">Faltam</div>
                            <div className="x-stat-val">{faltandoTimes.length}</div>
                        </div>
                        <div className="x-stat">
                            <div className="x-stat-lbl">Partida</div>
                            <div className="x-stat-val">#{data.id}</div>
                        </div>
                    </div>

                    <div className="x-grid-2">
                        {/* Main: tabs + rating */}
                        <div className="x-card pad-lg">
                            <div className="x-card-title">Avaliar cada time</div>
                            <p className="x-card-sub">Dê uma nota de 0 a 10 para cada time.</p>
                            <hr className="x-divider" />

                            {/* Tabs dos times */}
                            <div className="x-tabs">
                                {times.map((t) => {
                                    const isActive = t.alvoId === tab;
                                    const notaDraft = notasPorTime[t.alvoId];
                                    const has = typeof notaDraft === "number";
                                    return (
                                        <button
                                            key={t.alvoId}
                                            className={`x-tab ${isActive ? "on" : ""}`}
                                            onClick={() => setTab(t.alvoId)}
                                        >
                                            <span className="x-tab-name">Time {t.numero}</span>
                                            <span className="x-tab-sub">{t.jogadores.length} jogadores</span>
                                            <span className="x-tab-badge">{has ? notaDraft : "—"}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {timeSelecionado && (
                                <>
                                    <div className="x-row" style={{ marginBottom: 20 }}>
                                        <div className="x-avatar sm">T{timeSelecionado.numero}</div>
                                        <div className="x-row-main">
                                            <div className="x-row-name">Time {timeSelecionado.numero}</div>
                                            <div className="x-row-meta">
                                                {timeSelecionado.jogadores.map((j) => (
                                                    <span key={j.usuarioId} className="x-pill">{j.nome}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="x-row-actions">
                                            <div className="x-stat-val" style={{ fontSize: 28 }}>
                                                {notaLocal.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="x-label" style={{ marginBottom: 10 }}>
                                        Nota do time (0 a 10)
                                    </div>
                                    <div className="x-scale">
                                        {Array.from({ length: 11 }).map((_, i) => (
                                            <button
                                                key={i}
                                                className={i === notaLocal ? "on" : ""}
                                                onClick={() => setNotaTime(timeSelecionado.alvoId, i)}
                                                disabled={!podeInteragir}
                                            >
                                                {i}
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "space-between" }}>
                                        <button
                                            className="x-btn ghost"
                                            onClick={() => {
                                                const idx = times.findIndex((t) => t.alvoId === tab);
                                                const prev = idx <= 0 ? times.length - 1 : idx - 1;
                                                setTab(times[prev].alvoId);
                                            }}
                                            disabled={!times.length}
                                        >← Anterior</button>
                                        <button
                                            className="x-btn ghost"
                                            onClick={() => {
                                                const idx = times.findIndex((t) => t.alvoId === tab);
                                                const next = idx >= times.length - 1 ? 0 : idx + 1;
                                                setTab(times[next].alvoId);
                                            }}
                                            disabled={!times.length}
                                        >Próximo →</button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Side: resumo + ações */}
                        <div className="x-card pad-lg">
                            <div className="x-card-title">Resumo</div>
                            <p className="x-card-sub">Seu progresso.</p>
                            <hr className="x-divider" />

                            <div className="x-side-summary">
                                {times.map((t) => {
                                    const nota = notasPorTime[t.alvoId];
                                    const has = typeof nota === "number";
                                    return (
                                        <div className={`x-side-row ${has ? "has" : ""}`} key={t.alvoId}>
                                            <div>
                                                <div className="x-side-row-name">Time {t.numero}</div>
                                                <div className="x-side-row-sub">{t.jogadores.length} jogadores</div>
                                            </div>
                                            <div className="x-side-row-val">{has ? nota : "—"}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            <hr className="x-divider" />

                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <button className="x-btn block" onClick={onEnviar} disabled={!podeEnviar}>
                                    {sending ? "..." : "Enviar avaliação"} <span className="x-btn-arr">→</span>
                                </button>
                                <button className="x-btn ghost block" onClick={onLimpar} disabled={sending || jaEnviouAvaliacao}>
                                    Limpar rascunho
                                </button>
                            </div>

                            <p className="x-meta" style={{ marginTop: 16, fontSize: 12, lineHeight: 1.5 }}>
                                Ao enviar, suas notas são registradas e o site bloqueia nova edição neste dispositivo.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
