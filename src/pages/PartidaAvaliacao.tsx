import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
    statusPartida:
    | "ABERTA"
    | "LISTA_FECHADA"
    | "AVALIACAO_LIBERADA"
    | "ENCERRADA"
    | string;
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

    return status
        ? `Erro (HTTP ${status}): ${msg}`
        : "Falha de rede / CORS / backend fora.";
}

function clampInt(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, Math.round(n)));
}

// bloqueio front-only (1 envio por usuario+partida)
function sentKey(partidaId: string | number, meuId: number) {
    return `avaliacao_enviada_partida_${String(partidaId)}_user_${String(meuId)}`;
}

export default function PartidaAvaliacaoTimesPage() {
    const nav = useNavigate();
    const { partidaId } = useParams();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const [data, setData] = useState<PartidaDetalhe | null>(null);
    const [meuId, setMeuId] = useState<number | null>(null);

    // bloqueio SOMENTE no front
    const [jaEnviouAvaliacao, setJaEnviouAvaliacao] = useState(false);

    // rascunho (notas escolhidas)
    const [notasPorTime, setNotasPorTime] = useState<Record<string, number>>({});
    const [sending, setSending] = useState(false);

    // tab selecionada
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

            // gates UX
            if (d.statusPartida !== "AVALIACAO_LIBERADA") {
                setErr(`Avaliação não está liberada. Status atual: ${d.statusPartida}`);
            }
            if (!d.timesGerados || (d.timesGerados.times ?? []).length === 0) {
                setErr("Times ainda não foram gerados para esta partida.");
            }

            if (uid) {
                const minha = (d.presencas ?? []).find((p) => p.usuarioId === uid);
                if (!minha || minha.statusPresenca !== "CONFIRMADO") {
                    setErr("Você precisa estar CONFIRMADO nesta partida para avaliar.");
                }

                // lê bloqueio local (só após envio)
                const key = sentKey(partidaId, uid);
                setJaEnviouAvaliacao(localStorage.getItem(key) === "1");
            }
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
    }, [tab, times.length]);

    const timeSelecionado = useMemo(() => {
        return times.find((t) => t.alvoId === tab) ?? null;
    }, [times, tab]);

    const notaLocal = tab ? (notasPorTime[tab] ?? 0) : 0;

    function setNotaTime(alvoId: string, n: number) {
        if (jaEnviouAvaliacao) return;
        const val = clampInt(n, 0, 10);

        setNotasPorTime((prev) => ({ ...prev, [alvoId]: val }));

        // ✅ limpa erro de validação ao alterar nota
        setErr(null);
    }

    // ✅ exige votar em TODOS os times
    const faltandoAlvos = useMemo(() => {
        const missing: string[] = [];
        for (const t of times) {
            const has = Object.prototype.hasOwnProperty.call(notasPorTime, t.alvoId);
            if (!has) missing.push(t.alvoId);
        }
        return missing;
    }, [times, notasPorTime]);

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

        // ✅ trava envio se não votou em todos
        if (faltandoAlvos.length > 0) {
            setErr(`Faltou avaliar: ${faltandoAlvos.join(", ")}`);
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

            // ✅ BLOQUEIA só depois do POST OK
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

    if (loading) return <div className="ptdLoading">Carregando avaliação...</div>;
    if (!data) return null;

    return (
        <div className="ptdShell">
            <div className="ptdPanel avTPanel">
                <div className="ptdTopBar">
                    <button className="ptdIconBtn" onClick={() => nav(-1)} type="button">
                        ←
                    </button>
                    <div className="ptdTopTitle">Avaliar times</div>
                    <button
                        className="ptdGhostBtn"
                        type="button"
                        onClick={() => nav(`/partidas/${data.id}`)}
                    >
                        Partida
                    </button>
                </div>

                {(ok || err) && <div className={`ptdMsg ${ok ? "ok" : "err"}`}>{ok ?? err}</div>}

                <div className="avTBody">
                    {jaEnviouAvaliacao && (
                        <div className="avTNotice ok">
                            Você já enviou sua avaliação. Edição bloqueada no site.
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="avTTabs">
                        {times.map((t) => {
                            const isActive = t.alvoId === tab;
                            const notaDraft = notasPorTime[t.alvoId];

                            return (
                                <button
                                    key={t.alvoId}
                                    className={`avTTab ${isActive ? "isActive" : ""}`}
                                    type="button"
                                    onClick={() => setTab(t.alvoId)}
                                >
                                    <div className="avTTabTop">
                                        <span>Time {t.numero}</span>
                                        <span className="avTTabBadge">
                                            {typeof notaDraft === "number" ? notaDraft : "—"}
                                        </span>
                                    </div>
                                    <div className="avTTabSub">{t.alvoId}</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Card */}
                    <div className="avTCard">
                        {!timeSelecionado ? (
                            <div className="ptdEmpty">Selecione um time.</div>
                        ) : (
                            <>
                                <div className="avTCardTop">
                                    <div className="avTCardLeft">
                                        <div className="avTCardTitle">Time {timeSelecionado.numero}</div>
                                        <div className="avTCardMeta">
                                            alvoId: <strong>{timeSelecionado.alvoId}</strong>
                                        </div>
                                    </div>

                                    <div className="avTScore">
                                        <div className="avTScoreLabel">Nota</div>
                                        <div className="avTScoreValue">{notaLocal.toFixed(1)}</div>
                                    </div>
                                </div>

                                {faltandoAlvos.length > 0 && !jaEnviouAvaliacao ? (
                                    <div className="avTNotice">
                                        Falta avaliar: <strong>{faltandoAlvos.join(", ")}</strong>
                                    </div>
                                ) : (
                                    <div className="avTNotice">
                                        Escolha a nota de cada time e envie em lote.
                                    </div>
                                )}

                                {/* roster */}
                                <div className="avTRosterPlain">
                                    {timeSelecionado.jogadores.map((j) => (
                                        <div className="avTRosterPill" key={j.usuarioId} title={j.nome}>
                                            {j.nome}
                                        </div>
                                    ))}
                                </div>

                                {/* escala 0..10 */}
                                <div className="avTScale">
                                    <div className="avTScaleLabel">Nota do time (0–10)</div>
                                    <div className="avTScaleBtns">
                                        {Array.from({ length: 11 }).map((_, i) => {
                                            const isActive = i === notaLocal;
                                            const disabled = jaEnviouAvaliacao;

                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className={`avTScaleBtn ${isActive ? "isActive" : ""}`}
                                                    onClick={() => setNotaTime(timeSelecionado.alvoId, i)}
                                                    disabled={disabled}
                                                >
                                                    {i}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {jaEnviouAvaliacao && (
                                        <div className="avTLocked">Edição bloqueada: avaliação já enviada.</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="avTActions">
                        <button
                            className="ptdBtn primary"
                            type="button"
                            onClick={onEnviar}
                            disabled={sending || jaEnviouAvaliacao || faltandoAlvos.length > 0}
                        >
                            {sending ? "..." : "Enviar (uma vez)"}
                        </button>

                        <button
                            className="ptdBtn"
                            type="button"
                            onClick={() => setNotasPorTime({})}
                            disabled={sending || jaEnviouAvaliacao}
                        >
                            Limpar rascunho
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}