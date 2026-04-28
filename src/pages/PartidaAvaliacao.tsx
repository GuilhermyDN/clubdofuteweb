import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { getPartida, enviarAvaliacoesJogadores, getAvaliacoesPartida } from "../services/partidas";
import AppHeader from "../components/AppHeader";
import UserAvatar from "../components/UserAvatar";
import UserDetalheModal from "../components/UserDetalheModal";
import StarRating from "../components/StarRating";
import { toast } from "../components/Toast";
import { explainError, isAuthError } from "../utils/errors";

type Presenca = { usuarioId: number; nome: string; statusPresenca: "CONFIRMADO" | "CANCELADO" | string; fotoPerfil?: string | null; };
type TimeJogador = { usuarioId: number; nome: string; nota: number; fotoPerfil?: string | null; };
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

type JogadorAvaliavel = {
    usuarioId: number;
    nome: string;
    timeNumero: number | null; // null = reserva
    fotoPerfil?: string | null;
};

export default function PartidaAvaliacaoPage() {
    const nav = useNavigate();
    const { partidaId } = useParams();

    const [loading, setLoading] = useState(true);
    const [gateErr, setGateErr] = useState<string | null>(null);
    const [data, setData] = useState<PartidaDetalhe | null>(null);
    const [meuId, setMeuId] = useState<number | null>(null);

    const [jaEnviouAvaliacao, setJaEnviouAvaliacao] = useState(false);
    const [notasPorUsuario, setNotasPorUsuario] = useState<Record<number, number>>({});
    const [sending, setSending] = useState(false);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [userDetalhe, setUserDetalhe] = useState<{ usuarioId: number; nome: string; fotoPerfil?: string | null } | null>(null);

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
                let enviou = localStorage.getItem(key) === "1";
                // checa server-side: se ja existir avaliacao minha pra essa partida, trava
                if (!enviou) {
                    try {
                        const res = await getAvaliacoesPartida(partidaId);
                        const lista = (res?.avaliacoes ?? []) as Array<any>;
                        const minha = lista.some((a) => Number(a?.avaliadorUsuarioId ?? a?.usuarioAvaliadorId ?? a?.usuarioId) === uid);
                        if (minha) {
                            enviou = true;
                            localStorage.setItem(key, "1");
                        }
                    } catch { /* endpoint pode nao existir; ignora */ }
                }
                setJaEnviouAvaliacao(enviou);
            } else { setJaEnviouAvaliacao(false); }
            setGateErr(g);
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha ao carregar avaliação");
        } finally { setLoading(false); }
    }

    useEffect(() => { loadPartida(); /* eslint-disable-next-line */ }, [partidaId]);

    const { dia, hora } = useMemo(() => fmtDataHora(data?.dataHora), [data?.dataHora]);

    // Todos os jogadores (times + reservas), menos eu mesmo
    const jogadores = useMemo((): JogadorAvaliavel[] => {
        if (!data?.timesGerados) return [];
        const list: JogadorAvaliavel[] = [];
        (data.timesGerados.times ?? []).forEach((t) => {
            (t.jogadores ?? []).forEach((j) => {
                list.push({ usuarioId: j.usuarioId, nome: j.nome, timeNumero: t.numero, fotoPerfil: j.fotoPerfil });
            });
        });
        (data.timesGerados.reservas ?? []).forEach((r) => {
            list.push({ usuarioId: r.usuarioId, nome: r.nome, timeNumero: null, fotoPerfil: r.fotoPerfil });
        });
        return list.filter((j) => j.usuarioId !== meuId);
    }, [data?.timesGerados, meuId]);

    const currentJogador = jogadores[currentIdx] ?? null;
    const notaLocal = currentJogador ? (notasPorUsuario[currentJogador.usuarioId] ?? 0) : 0;

    function setNotaJogador(usuarioId: number, n: number) {
        if (jaEnviouAvaliacao) return;
        setNotasPorUsuario((prev) => ({ ...prev, [usuarioId]: clampInt(n, 0, 10) }));
    }

    const faltando = useMemo(() => {
        return jogadores.filter((j) => !Object.prototype.hasOwnProperty.call(notasPorUsuario, j.usuarioId));
    }, [jogadores, notasPorUsuario]);

    const podeInteragir = !!data && !gateErr && !jaEnviouAvaliacao;
    const allRated = faltando.length === 0 && jogadores.length > 0;

    async function onEnviar() {
        if (!partidaId) return;
        if (jaEnviouAvaliacao) { toast.warn("Você já enviou sua avaliação."); return; }
        if (!data) { toast.warn("Partida não carregada."); return; }
        if (data.statusPartida !== "AVALIACAO_LIBERADA") { toast.warn(`Avaliação não liberada (status: ${data.statusPartida}).`); return; }
        if (jogadores.length === 0) { toast.warn("Nenhum jogador pra avaliar."); return; }
        if (faltando.length > 0) {
            toast.warn(`Faltou avaliar ${faltando.length} jogador(es).`);
            return;
        }

        const payload = jogadores.map((j) => ({
            usuarioId: j.usuarioId,
            nota: clampInt(notasPorUsuario[j.usuarioId], 0, 10),
        }));

        try {
            setSending(true);
            await enviarAvaliacoesJogadores(partidaId, payload);
            toast.success("Avaliação enviada. Obrigado!", "Pronto");
            if (meuId != null) {
                localStorage.setItem(sentKey(partidaId, meuId), "1");
                setJaEnviouAvaliacao(true);
            }
            setTimeout(() => nav(`/equipes/${data.equipeId}`), 900);
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

    const isLast = currentIdx >= jogadores.length - 1;
    const isFirst = currentIdx <= 0;
    const currentRated = !!currentJogador && typeof notasPorUsuario[currentJogador.usuarioId] === "number";
    const progress = jogadores.length ? ((jogadores.length - faltando.length) / jogadores.length) * 100 : 0;

    function goPrev() { if (!isFirst) setCurrentIdx((i) => i - 1); }
    function goNextOrSend() {
        if (!currentRated && !jaEnviouAvaliacao) {
            toast.warn("Dê uma nota antes de avançar.");
            return;
        }
        if (!isLast) {
            setCurrentIdx((i) => i + 1);
            return;
        }
        if (!allRated) {
            const missingIdx = jogadores.findIndex((j) => !Object.prototype.hasOwnProperty.call(notasPorUsuario, j.usuarioId));
            if (missingIdx >= 0) { setCurrentIdx(missingIdx); return; }
        }
        onEnviar();
    }

    return (
        <div className="x-app">
            <AppHeader />

            <div className="x-phero">
                <div className="x-phero-inner">
                    <button className="x-phero-back" onClick={() => nav(-1)}>← Voltar</button>
                    <div className="x-phero-grid">
                        <div>
                            <div className="x-eyebrow">Avaliar jogadores</div>
                            <h1 className="x-phero-title" style={{ marginTop: 12 }}>
                                {dia}
                            </h1>
                            <div className="x-meta" style={{ marginBottom: 18 }}>Horário: {hora}</div>
                            <div className="x-phero-meta">
                                <span className="x-pill">{data.statusPartida}</span>
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
                                    Suas notas ficam bloqueadas neste dispositivo.
                                </span>
                            </div>
                        </div>
                    )}

                    {!gateErr && jogadores.length === 0 && !jaEnviouAvaliacao && (
                        <div className="x-empty">
                            <h3 className="x-empty-title">Ninguém pra avaliar</h3>
                            <p className="x-empty-text">Você é o único jogador confirmado nesta partida.</p>
                        </div>
                    )}

                    {jogadores.length > 0 && (
                        <div className="x-wizard x-reveal">
                            {/* Stepper */}
                            <div className="x-wizard-head">
                                <div className="x-wizard-step-label">
                                    Jogador <strong>{currentIdx + 1}</strong> de <strong>{jogadores.length}</strong>
                                </div>
                                <div className="x-wizard-dots">
                                    {jogadores.map((j, i) => {
                                        const has = typeof notasPorUsuario[j.usuarioId] === "number";
                                        const cur = i === currentIdx;
                                        return (
                                            <button
                                                key={j.usuarioId}
                                                type="button"
                                                className={`x-wizard-dot ${cur ? "cur" : ""} ${has ? "has" : ""}`}
                                                onClick={() => setCurrentIdx(i)}
                                                aria-label={`Ir para ${j.nome}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="x-progress" aria-hidden>
                                <div className="x-progress-fill" style={{ width: `${progress}%` }} />
                            </div>

                            {currentJogador && (
                                <div className="x-wizard-card">
                                    <div className="x-wizard-team">
                                        <UserAvatar nome={currentJogador.nome} fotoPerfil={currentJogador.fotoPerfil} size="lg" />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 className="x-wizard-team-name">{currentJogador.nome}</h3>
                                            <div className="x-wizard-team-sub">
                                                {currentJogador.timeNumero != null
                                                    ? `Time ${currentJogador.timeNumero}`
                                                    : "Reserva"}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="x-btn ghost sm"
                                            onClick={() => setUserDetalhe({ usuarioId: currentJogador.usuarioId, nome: currentJogador.nome, fotoPerfil: currentJogador.fotoPerfil })}
                                            title="Ver detalhes"
                                        >
                                            Detalhes
                                        </button>
                                    </div>

                                    <div className="x-wizard-rating">
                                        <div className="x-wizard-rating-label">Como foi a atuação deste jogador?</div>
                                        <StarRating
                                            value={notaLocal}
                                            onChange={(v) => setNotaJogador(currentJogador.usuarioId, v)}
                                            disabled={!podeInteragir}
                                        />
                                    </div>
                                </div>
                            )}

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
                                Suas notas ficam registradas e o site bloqueia nova edição neste dispositivo.
                            </p>
                        </div>
                    )}
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
