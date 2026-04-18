import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { getPartida, enviarAvaliacoesTimes } from "../services/partidas";
import AppHeader from "../components/AppHeader";
import StarRating from "../components/StarRating";
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
                const minha = (d.presencas ?? []).find((p: Presenca) => p.usuarioId === uid);
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
            // redireciona pra tela da equipe após curta pausa pra o usuário ver o toast
            setTimeout(() => {
                if (data?.equipeId) nav(`/equipes/${data.equipeId}`, { replace: true });
                else nav(-1);
            }, 900);
        } catch (e: any) {
            if (!isAuthError(e)) toast.error(explainError(e), "Falha ao enviar avaliação");
        }
        finally { setSending(false); }
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

                    {/* Wizard: um time por vez */}
                    {(() => {
                        const currentIndex = Math.max(0, times.findIndex((t) => t.alvoId === tab));
                        const isLast = currentIndex >= times.length - 1;
                        const isFirst = currentIndex <= 0;
                        const currentRated = typeof notasPorTime[tab] === "number";
                        const allRated = faltandoTimes.length === 0;
                        const progress = times.length
                            ? ((times.length - faltandoTimes.length) / times.length) * 100
                            : 0;

                        function goPrev() {
                            if (isFirst) return;
                            setTab(times[currentIndex - 1].alvoId);
                        }
                        function goNextOrSend() {
                            if (!currentRated) {
                                toast.warn("Dê uma nota antes de avançar.");
                                return;
                            }
                            if (!isLast) {
                                setTab(times[currentIndex + 1].alvoId);
                                return;
                            }
                            // último time — envia
                            if (!allRated) {
                                // pula pro primeiro time ainda não avaliado
                                const missing = faltandoTimes[0];
                                if (missing) { setTab(missing.alvoId); return; }
                            }
                            onEnviar();
                        }

                        return (
                            <div className="x-wizard x-reveal">
                                {/* Stepper */}
                                <div className="x-wizard-head">
                                    <div className="x-wizard-step-label">
                                        Time <strong>{currentIndex + 1}</strong> de <strong>{times.length}</strong>
                                    </div>
                                    <div className="x-wizard-dots">
                                        {times.map((t, i) => {
                                            const has = typeof notasPorTime[t.alvoId] === "number";
                                            const cur = i === currentIndex;
                                            return (
                                                <button
                                                    key={t.alvoId}
                                                    type="button"
                                                    className={`x-wizard-dot ${cur ? "cur" : ""} ${has ? "has" : ""}`}
                                                    onClick={() => setTab(t.alvoId)}
                                                    aria-label={`Ir para Time ${t.numero}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="x-progress" aria-hidden>
                                    <div className="x-progress-fill" style={{ width: `${progress}%` }} />
                                </div>

                                {/* Team card */}
                                {timeSelecionado && (
                                    <div className="x-wizard-card">
                                        <div className="x-wizard-team">
                                            <div className="x-avatar lg">T{timeSelecionado.numero}</div>
                                            <div>
                                                <h3 className="x-wizard-team-name">Time {timeSelecionado.numero}</h3>
                                                <div className="x-wizard-team-sub">
                                                    {timeSelecionado.jogadores.length} jogador{timeSelecionado.jogadores.length !== 1 ? "es" : ""}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="x-wizard-roster">
                                            {timeSelecionado.jogadores.map((j) => (
                                                <div key={j.usuarioId} className="x-wizard-player">
                                                    <div className="x-avatar sm teal">
                                                        {String(j.nome || "?").trim().charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>{j.nome}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="x-wizard-rating">
                                            <div className="x-wizard-rating-label">Qual nota para este time?</div>
                                            <StarRating
                                                value={notaLocal}
                                                onChange={(v) => setNotaTime(timeSelecionado.alvoId, v)}
                                                disabled={!podeInteragir}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Nav buttons */}
                                <div className="x-wizard-nav">
                                    <button
                                        className="x-btn ghost"
                                        onClick={goPrev}
                                        disabled={isFirst}
                                    >
                                        ← Anterior
                                    </button>
                                    <button
                                        className="x-btn"
                                        onClick={goNextOrSend}
                                        disabled={!podeInteragir || sending || (isLast && !currentRated)}
                                    >
                                        {sending
                                            ? "Enviando..."
                                            : isLast && allRated
                                                ? "Enviar avaliação"
                                                : "Próximo"}
                                        <span className="x-btn-arr">→</span>
                                    </button>
                                </div>

                                <p className="x-wizard-fine">
                                    Ao enviar, suas notas ficam registradas e o site bloqueia nova edição neste dispositivo.
                                </p>
                            </div>
                        );
                    })()}
                </div>
            </main>
        </div>
    );
}
