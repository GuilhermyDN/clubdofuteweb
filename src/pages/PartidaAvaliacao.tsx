import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "../styles/avaliacao.css";

import { api } from "../services/api";
import { getPartida, enviarAvaliacoesTimes } from "../services/partidas";

type Presenca = {
    usuarioId: number;
    nome: string;
    statusPresenca: "CONFIRMADO" | "CANCELADO" | string;
};

type TimeJogador = {
    usuarioId: number;
    nome: string;
    nota: number;
};

type TimeGerado = {
    numero: number;
    jogadores: TimeJogador[];
};

type TimesGerados = {
    id: number;
    partidaId: number;
    times: TimeGerado[];
    reservas: TimeJogador[];
    geradoEm: string;
};

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

function explainAxiosError(e: any) {
    const status = e?.response?.status;
    const resData = e?.response?.data;
    const msg =
        typeof resData?.mensagem === "string"
            ? resData.mensagem
            : typeof resData?.message === "string"
                ? resData.message
                : JSON.stringify(resData);

    return status ? `Erro (HTTP ${status}): ${msg}` : "Falha de rede / CORS / backend fora.";
}

function clampInt(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, Math.round(n)));
}

// bloqueio front-only (1 envio por usuario+partida)
function sentKey(partidaId: string | number, meuId: number) {
    return `avaliacao_enviada_partida_${String(partidaId)}_user_${String(meuId)}`;
}

function fmtDataHora(iso?: string) {
    if (!iso) return { dia: "—", hora: "—" };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { dia: "—", hora: "—" };
    const dia = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return { dia, hora };
}

export default function PartidaAvaliacaoTimesPage() {
    const nav = useNavigate();
    const { partidaId } = useParams();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const [data, setData] = useState<PartidaDetalhe | null>(null);
    const [meuId, setMeuId] = useState<number | null>(null);

    const [jaEnviouAvaliacao, setJaEnviouAvaliacao] = useState(false);

    const [notasPorTime, setNotasPorTime] = useState<Record<string, number>>({});
    const [sending, setSending] = useState(false);

    const [tab, setTab] = useState<string>("");

    async function loadPartida() {
        if (!partidaId) {
            setErr("ID de partida ausente.");
            return;
        }

        setErr(null);
        setOk(null);
        setLoading(true);

        try {
            const euRes = await api.get<EuResponse>("/eu");
            const uid = euRes.data?.id ?? null;
            setMeuId(uid);

            const d = await getPartida(partidaId);
            setData(d);

            let gateErr: string | null = null;

            if (d.statusPartida !== "AVALIACAO_LIBERADA") {
                gateErr = `Avaliação não está liberada. Status atual: ${d.statusPartida}`;
            }

            const timesGerados = d.timesGerados?.times ?? [];
            if (!gateErr && (!d.timesGerados || timesGerados.length === 0)) {
                gateErr = "Times ainda não foram gerados para esta partida.";
            }

            if (!gateErr && uid) {
                const minha = (d.presencas ?? []).find((p) => p.usuarioId === uid);
                if (!minha || minha.statusPresenca !== "CONFIRMADO") {
                    gateErr = "Você precisa estar CONFIRMADO nesta partida para avaliar.";
                }
            }

            if (uid) {
                const key = sentKey(partidaId, uid);
                setJaEnviouAvaliacao(localStorage.getItem(key) === "1");
            } else {
                setJaEnviouAvaliacao(false);
            }

            setErr(gateErr);
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 401 || status === 403) {
                nav("/login");
                return;
            }
            setErr(explainAxiosError(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPartida();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partidaId]);

    const { dia, hora } = useMemo(() => fmtDataHora(data?.dataHora), [data?.dataHora]);

    const times = useMemo(() => {
        const list = data?.timesGerados?.times ?? [];
        return list.map((t) => ({
            numero: t.numero,
            alvoId: `TIME_${t.numero}`,
            jogadores: t.jogadores ?? [],
        }));
    }, [data?.timesGerados]);

    useEffect(() => {
        if (!tab && times.length > 0) setTab(times[0].alvoId);
    }, [tab, times]);

    const timeSelecionado = useMemo(() => times.find((t) => t.alvoId === tab) ?? null, [times, tab]);

    const notaLocal = tab ? (notasPorTime[tab] ?? 0) : 0;

    function setNotaTime(alvoId: string, n: number) {
        if (jaEnviouAvaliacao) return;
        setNotasPorTime((prev) => ({ ...prev, [alvoId]: clampInt(n, 0, 10) }));
        setErr(null);
        setOk(null);
    }

    const faltandoTimes = useMemo(() => {
        const missing: { alvoId: string; numero: number }[] = [];
        for (const t of times) {
            const has = Object.prototype.hasOwnProperty.call(notasPorTime, t.alvoId);
            if (!has) missing.push({ alvoId: t.alvoId, numero: t.numero });
        }
        return missing;
    }, [times, notasPorTime]);

    const podeInteragir = !!data && !err && !jaEnviouAvaliacao;
    const podeEnviar = podeInteragir && !sending && faltandoTimes.length === 0 && data?.statusPartida === "AVALIACAO_LIBERADA";

    async function onEnviar() {
        if (!partidaId) return;
        setErr(null);
        setOk(null);

        if (jaEnviouAvaliacao) {
            setErr("Você já enviou sua avaliação para esta partida.");
            return;
        }
        if (!data) {
            setErr("Partida não carregada.");
            return;
        }
        if (data.statusPartida !== "AVALIACAO_LIBERADA") {
            setErr(`Avaliação não está liberada. Status atual: ${data.statusPartida}`);
            return;
        }
        if (!data.timesGerados || times.length === 0) {
            setErr("Times ainda não foram gerados.");
            return;
        }
        if (faltandoTimes.length > 0) {
            setErr(`Faltou avaliar: ${faltandoTimes.map((t) => `Time ${t.numero}`).join(", ")}`);
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
            setOk("Avaliação enviada.");

            if (meuId != null) {
                localStorage.setItem(sentKey(partidaId, meuId), "1");
                setJaEnviouAvaliacao(true);
            }
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setSending(false);
        }
    }

    function onLimpar() {
        if (sending || jaEnviouAvaliacao) return;
        setNotasPorTime({});
        setOk(null);
        setErr(null);
        if (times.length > 0) setTab(times[0].alvoId);
    }

    if (loading) {
        return (
            <div className="av2Shell">
                <div className="av2Card av2Center">
                    <div className="av2Spinner" />
                    <div className="av2Muted">Carregando avaliação...</div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="av2Shell">
            <div className="av2Card">
                {/* TOP */}
                <div className="av2Top">
                    <button className="av2IconBtn" onClick={() => nav(-1)} type="button" aria-label="Voltar">
                        ←
                    </button>

                    <div className="av2Brand">
                        <img className="av2Logo" src="/logo-oficial.png" alt="Logo" />
                        <div className="av2TitleWrap">
                            <div className="av2Title">Avaliar times</div>
                            <div className="av2Muted">Dê uma nota de 0 a 10 para cada time</div>
                        </div>
                    </div>

                    <div className="av2TopRight">
                        <button className="av2IconBtn" type="button" onClick={loadPartida} aria-label="Recarregar">
                            ↻
                        </button>
                        <button className="av2BtnSmall av2BtnGhost" type="button" onClick={() => nav(`/partidas/${data.id}`)}>
                            Partida
                        </button>
                    </div>
                </div>

                {/* HERO */}
                <div className="av2Hero">
                    <div className="av2HeroBg" />
                    <img className="av2HeroImg" src="/quadra-areia.jpg" alt="Quadra" />
                    <div className="av2HeroOverlay" />

                    <div className="av2HeroContent">
                        <div className="av2HeroLeft">
                            <div className="av2HeroTitle">{dia}</div>
                            <div className="av2HeroSub">{hora}</div>

                            <div className="av2Pills">
                                <span className="av2Pill">{data.statusPartida}</span>
                                <span className="av2Pill av2PillSoft">{data.politicaInscricao}</span>
                                {jaEnviouAvaliacao ? (
                                    <span className="av2Pill av2PillLock">Enviado (bloqueado)</span>
                                ) : (
                                    <span className="av2Pill av2PillSoft">Uma vez</span>
                                )}
                            </div>
                        </div>

                        <div className="av2HeroRight">
                            <div className="av2Stat">
                                <div className="av2StatLabel">Partida</div>
                                <div className="av2StatValue">#{data.id}</div>
                            </div>

                            <div className="av2Stat">
                                <div className="av2StatLabel">Times</div>
                                <div className="av2StatValue">{times.length}</div>
                            </div>

                            <div className="av2Stat">
                                <div className="av2StatLabel">Faltam</div>
                                <div className="av2StatValue">{Math.max(0, faltandoTimes.length)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {(ok || err) && (
                    <div className={`av2Alert ${ok ? "av2AlertOk" : "av2AlertErr"}`}>
                        <div>
                            <div className="av2AlertTitle">{ok ? "Sucesso" : "Atenção"}</div>
                            <div className="av2AlertText">{ok ?? err}</div>
                        </div>
                        <button className="av2AlertClose" onClick={() => (ok ? setOk(null) : setErr(null))} aria-label="Fechar">
                            ×
                        </button>
                    </div>
                )}

                {/* BODY */}
                <div className="av2Body">
                    {jaEnviouAvaliacao && (
                        <div className="av2Notice ok">
                            Você já enviou sua avaliação. As notas ficam bloqueadas neste dispositivo.
                        </div>
                    )}

                    {!jaEnviouAvaliacao && faltandoTimes.length > 0 && (
                        <div className="av2Notice">
                            Falta avaliar: <strong>{faltandoTimes.map((t) => `Time ${t.numero}`).join(", ")}</strong>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="av2Tabs">
                        {times.map((t) => {
                            const isActive = t.alvoId === tab;
                            const notaDraft = notasPorTime[t.alvoId];
                            const has = typeof notaDraft === "number";

                            return (
                                <button
                                    key={t.alvoId}
                                    className={`av2Tab ${isActive ? "isActive" : ""} ${has ? "hasNote" : ""}`}
                                    type="button"
                                    onClick={() => setTab(t.alvoId)}
                                >
                                    <div className="av2TabTop">
                                        <span className="av2TabName">Time {t.numero}</span>
                                        <span className="av2TabBadge">{has ? notaDraft : "—"}</span>
                                    </div>
                                    <div className="av2TabSub">{t.jogadores.length} jogadores</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Card */}
                    <div className="av2MainGrid">
                        <div className="av2MainCard">
                            {!timeSelecionado ? (
                                <div className="av2Empty">Selecione um time.</div>
                            ) : (
                                <>
                                    <div className="av2MainTop">
                                        <div className="av2MainLeft">
                                            <div className="av2MainTitle">Time {timeSelecionado.numero}</div>
                                            <div className="av2MainMeta">Escolha a nota e avance para o próximo.</div>
                                        </div>

                                        <div className="av2Score">
                                            <div className="av2ScoreLabel">Nota</div>
                                            <div className="av2ScoreValue">{notaLocal.toFixed(1)}</div>
                                        </div>
                                    </div>

                                    <div className="av2Roster">
                                        <div className="av2RosterTitle">Jogadores</div>
                                        <div className="av2RosterGrid">
                                            {timeSelecionado.jogadores.map((j) => (
                                                <div className="av2Player" key={j.usuarioId} title={j.nome}>
                                                    <div className="av2Avatar" aria-hidden="true">
                                                        {String(j.nome || "?").trim().charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="av2PlayerName">{j.nome}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="av2Scale">
                                        <div className="av2ScaleHead">
                                            <div className="av2ScaleLabel">Nota do time (0–10)</div>
                                            {!podeInteragir && (
                                                <div className="av2ScaleHint">
                                                    {jaEnviouAvaliacao ? "Bloqueado" : err ? "Indisponível" : ""}
                                                </div>
                                            )}
                                        </div>

                                        <div className="av2ScaleBtns">
                                            {Array.from({ length: 11 }).map((_, i) => {
                                                const isActive = i === notaLocal;
                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        className={`av2ScaleBtn ${isActive ? "isActive" : ""}`}
                                                        onClick={() => timeSelecionado && setNotaTime(timeSelecionado.alvoId, i)}
                                                        disabled={!podeInteragir}
                                                    >
                                                        {i}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="av2NavRow">
                                            <button
                                                className="av2Btn av2BtnGhost"
                                                type="button"
                                                onClick={() => {
                                                    if (!times.length) return;
                                                    const idx = times.findIndex((t) => t.alvoId === tab);
                                                    const prev = idx <= 0 ? times.length - 1 : idx - 1;
                                                    setTab(times[prev].alvoId);
                                                }}
                                                disabled={!times.length}
                                            >
                                                ← Anterior
                                            </button>

                                            <button
                                                className="av2Btn av2BtnGhost"
                                                type="button"
                                                onClick={() => {
                                                    if (!times.length) return;
                                                    const idx = times.findIndex((t) => t.alvoId === tab);
                                                    const next = idx >= times.length - 1 ? 0 : idx + 1;
                                                    setTab(times[next].alvoId);
                                                }}
                                                disabled={!times.length}
                                            >
                                                Próximo →
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="av2SideCard">
                            <div className="av2SideTitle">Resumo</div>

                            <div className="av2SideList">
                                {times.map((t) => {
                                    const nota = notasPorTime[t.alvoId];
                                    const has = typeof nota === "number";
                                    return (
                                        <div className={`av2SideRow ${has ? "has" : ""}`} key={t.alvoId}>
                                            <div className="av2SideLeft">
                                                <div className="av2SideName">Time {t.numero}</div>
                                                <div className="av2SideSub">{t.jogadores.length} jogadores</div>
                                            </div>
                                            <div className="av2SideRight">{has ? nota : "—"}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="av2Actions">
                                <button className="av2Btn primary" type="button" onClick={onEnviar} disabled={!podeEnviar}>
                                    {sending ? "..." : "Enviar (uma vez)"}
                                </button>

                                <button className="av2Btn av2BtnGhost" type="button" onClick={onLimpar} disabled={sending || jaEnviouAvaliacao}>
                                    Limpar rascunho
                                </button>

                                <button className="av2Btn av2BtnGhost" type="button" onClick={() => nav(`/equipes/${data.equipeId}`)}>
                                    Abrir equipe
                                </button>
                            </div>

                            <div className="av2FinePrint">
                                Ao enviar, suas notas são registradas e o site bloqueia nova edição neste dispositivo.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="av2Footer">
                    <button className="av2Btn av2BtnGhost" type="button" onClick={() => nav(-1)}>
                        Voltar
                    </button>
                    <button className="av2Btn" type="button" onClick={() => nav(`/partidas/${data.id}`)}>
                        Ver detalhes da partida
                    </button>
                </div>
            </div>
        </div>
    );
}