import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getPartida,
    confirmarPresenca,
    cancelarPresenca,
    fecharListaEGerarTimes,
    liberarAvaliacao,
    encerrarAvaliacao,
} from "../services/partidas";
import { api } from "../services/api";

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
type EquipeAdminResumo = { id: number };

function fmtDataHora(iso?: string) {
    if (!iso) return { dia: "—", hora: "—" };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { dia: "—", hora: "—" };
    const dia = d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
    });
    const hora = d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return { dia, hora };
}

function fmtISO(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR");
}

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

export default function PartidaDetalhePage() {
    const nav = useNavigate();
    const { partidaId } = useParams();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [data, setData] = useState<PartidaDetalhe | null>(null);

    const [souAdminDaEquipe, setSouAdminDaEquipe] = useState(false);
    const [meuId, setMeuId] = useState<number | null>(null);

    const [acting, setActing] = useState(false);
    const [generating, setGenerating] = useState(false);

    const [liberandoAvaliacao, setLiberandoAvaliacao] = useState(false);
    const [encerrandoAvaliacao, setEncerrandoAvaliacao] = useState(false);

    async function load() {
        if (!partidaId) {
            setErr("ID de partida ausente.");
            return;
        }

        setErr(null);
        setOk(null);
        setLoading(true);

        try {
            const euRes = await api.get<EuResponse>("/eu");
            setMeuId(euRes.data?.id ?? null);

            const d = await getPartida(partidaId);
            setData(d);

            try {
                const admRes = await api.get<EquipeAdminResumo[]>(
                    "/eu/equipes-administrador"
                );
                const lista = admRes.data ?? [];
                setSouAdminDaEquipe(lista.some((e) => e.id === d.equipeId));
            } catch {
                setSouAdminDaEquipe((euRes.data?.id ?? null) === d.criadoPorUsuarioId);
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
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partidaId]);

    const { dia, hora } = useMemo(() => fmtDataHora(data?.dataHora), [data?.dataHora]);

    const presencas = useMemo(() => data?.presencas ?? [], [data?.presencas]);

    const confirmados = useMemo(
        () => presencas.filter((p) => p.statusPresenca === "CONFIRMADO").length,
        [presencas]
    );

    const minhaPresenca = useMemo(() => {
        if (!meuId) return null;
        return presencas.find((p) => p.usuarioId === meuId) ?? null;
    }, [presencas, meuId]);

    const estouConfirmado = minhaPresenca?.statusPresenca === "CONFIRMADO";

    const limite = data?.limiteParticipantes ?? 0;
    const vagas = useMemo(
        () => (limite > 0 ? Math.max(0, limite - confirmados) : null),
        [limite, confirmados]
    );

    const partidaAberta = data?.statusPartida === "ABERTA";
    const listaFechada = data?.statusPartida === "LISTA_FECHADA";
    const avaliacaoLiberada = data?.statusPartida === "AVALIACAO_LIBERADA";

    const podeConfirmar =
        !!data &&
        partidaAberta &&
        !estouConfirmado &&
        (limite === 0 || confirmados < limite);

    const podeCancelar = !!data && partidaAberta && estouConfirmado;

    async function onConfirmar() {
        if (!partidaId) return;
        setErr(null);
        setOk(null);

        try {
            setActing(true);
            await confirmarPresenca(partidaId);
            setOk("Presença confirmada.");
            await load();
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setActing(false);
        }
    }

    async function onCancelar() {
        if (!partidaId) return;
        setErr(null);
        setOk(null);

        try {
            setActing(true);
            await cancelarPresenca(partidaId);
            setOk("Presença cancelada.");
            await load();
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setActing(false);
        }
    }

    async function onFecharListaEGerarTimes() {
        if (!partidaId) return;
        setErr(null);
        setOk(null);

        try {
            setGenerating(true);
            await fecharListaEGerarTimes(partidaId);
            setOk("Lista fechada e times gerados.");
            await load();
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setGenerating(false);
        }
    }

    async function onLiberarAvaliacao() {
        if (!partidaId) return;
        setErr(null);
        setOk(null);

        try {
            setLiberandoAvaliacao(true);
            await liberarAvaliacao(partidaId);
            setOk("Avaliação liberada.");
            await load();
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setLiberandoAvaliacao(false);
        }
    }

    async function onEncerrarAvaliacao() {
        if (!partidaId) return;
        setErr(null);
        setOk(null);

        try {
            setEncerrandoAvaliacao(true);
            await encerrarAvaliacao(partidaId);
            setOk("Avaliação encerrada.");
            await load();
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setEncerrandoAvaliacao(false);
        }
    }

    if (loading) return <div className="ptdLoading">Carregando partida...</div>;

    if (err) {
        return (
            <div className="ptdShell">
                <div className="ptdPanel">
                    <div className="ptdTopBar">
                        <button className="ptdIconBtn" onClick={() => nav(-1)} type="button">
                            ←
                        </button>
                        <div className="ptdTopTitle">Detalhes da partida</div>
                        <div className="ptdTopRight" />
                    </div>

                    <div className="ptdBody">
                        <div className="ptdMsg err">{err}</div>
                        <button className="ptdBtn" type="button" onClick={load}>
                            Tentar novamente
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="ptdShell">
            <div className="ptdPanel">
                {/* TOP */}
                <div className="ptdTopBar">
                    <button className="ptdIconBtn" onClick={() => nav(-1)} type="button">
                        ←
                    </button>
                    <div className="ptdTopTitle">Detalhes da partida</div>
                    <button
                        className="ptdGhostBtn"
                        type="button"
                        onClick={() => nav(`/equipes/${data.equipeId}`)}
                    >
                        Equipe
                    </button>
                </div>

                {(ok || err) && (
                    <div className={`ptdMsg ${ok ? "ok" : "err"}`}>{ok ?? err}</div>
                )}

                {/* COVER */}
                <div className="ptdCover">
                    <img src="/quadra.png" alt="Quadra" />
                    <div className="ptdCoverOverlay" />
                    <div className="ptdCoverText">
                        <div className="ptdCoverTitle">{dia}</div>
                        <div className="ptdCoverSub">
                            {hora} • {data.statusPartida} • {data.politicaInscricao}
                        </div>
                    </div>
                </div>

                {/* HEADER */}
                <div className="ptdHeader">
                    <div className="ptdHeaderLeft">
                        <div className="ptdName">Partida #{data.id}</div>
                        <div className="ptdMetaLine">
                            <span className="ptdDot">●</span>
                            <span>Equipe {data.equipeId}</span>
                        </div>
                    </div>

                    <div className="ptdHeaderRight">
                        <div className="ptdBadgeStatus">{data.statusPartida}</div>
                        <div className="ptdBadgeSmall">{data.politicaInscricao}</div>
                    </div>
                </div>

                {/* CHIPS */}
                <div className="ptdChips">
                    <div className="ptdChip">
                        <div className="ptdChipLabel">Jogadores/Time</div>
                        <div className="ptdChipValue">{String(data.jogadoresPorTime)}</div>
                    </div>
                    <div className="ptdChip">
                        <div className="ptdChipLabel">Limite</div>
                        <div className="ptdChipValue">
                            {data.limiteParticipantes ? String(data.limiteParticipantes) : "Sem limite"}
                        </div>
                    </div>
                    <div className="ptdChip">
                        <div className="ptdChipLabel">Criado em</div>
                        <div className="ptdChipValue">{fmtISO(data.criadoEm)}</div>
                    </div>
                    <div className="ptdChip">
                        <div className="ptdChipLabel">Confirmados</div>
                        <div className="ptdChipValue">{String(confirmados)}</div>
                    </div>
                </div>

                {/* PRESENÇAS */}
                <div className="ptdSectionTitle">Presenças</div>

                <div className="ptdStatsRow">
                    <div className="ptdStat">
                        <div className="ptdStatLabel">Confirmados</div>
                        <div className="ptdStatValue">{confirmados}</div>
                    </div>

                    <div className="ptdStat">
                        <div className="ptdStatLabel">Vagas</div>
                        <div className="ptdStatValue">{vagas === null ? "—" : String(vagas)}</div>
                    </div>

                    <div className="ptdStat">
                        <div className="ptdStatLabel">Minha presença</div>
                        <div className="ptdStatValue">
                            {minhaPresenca ? minhaPresenca.statusPresenca : "—"}
                        </div>
                    </div>
                </div>

                <div className="ptdCtaRow">
                    <button
                        className="ptdBtn primary"
                        type="button"
                        onClick={onConfirmar}
                        disabled={!podeConfirmar || acting}
                    >
                        {acting ? "..." : "Confirmar"}
                    </button>
                    <button
                        className="ptdBtn"
                        type="button"
                        onClick={onCancelar}
                        disabled={!podeCancelar || acting}
                    >
                        {acting ? "..." : "Cancelar"}
                    </button>
                </div>

                <div className="ptdTable">
                    <div className="ptdTr ptdTh">
                        <div>STATUS</div>
                        <div>NOME</div>
                        <div>ID</div>
                    </div>

                    {presencas.length === 0 ? (
                        <div className="ptdEmpty">Sem presenças.</div>
                    ) : (
                        presencas.map((p) => (
                            <div
                                className={`ptdTr ${p.statusPresenca === "CONFIRMADO" ? "isActive" : ""}`}
                                key={p.usuarioId}
                            >
                                <div className="ptdTd ptdPos">{p.statusPresenca}</div>
                                <div className="ptdTd ptdNameCell">{p.nome}</div>
                                <div className="ptdTd muted">{String(p.usuarioId)}</div>
                            </div>
                        ))
                    )}
                </div>

                {/* TIMES */}
                {data.timesGerados ? (
                    <>
                        <div className="ptdSectionTitle">Times gerados</div>

                        <div className="ptdTimesMeta">
                            <div className="ptdTimesLine">
                                <span>Gerado em</span>
                                <strong>{fmtISO(data.timesGerados.geradoEm)}</strong>
                            </div>
                        </div>

                        <div className="ptdTimesGrid">
                            {data.timesGerados.times.map((t) => (
                                <div className="ptdTeamCard" key={t.numero}>
                                    <div className="ptdTeamTitle">Time {t.numero}</div>
                                    <div className="ptdTeamList">
                                        {t.jogadores.map((j) => (
                                            <div className="ptdTeamRow" key={j.usuarioId}>
                                                <div className="ptdTeamName">{j.nome}</div>
                                                <div className="ptdTeamNota">{j.nota}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="ptdTeamCard">
                                <div className="ptdTeamTitle">Reservas</div>
                                <div className="ptdTeamList">
                                    {data.timesGerados.reservas.length === 0 ? (
                                        <div className="ptdEmpty">Sem reservas.</div>
                                    ) : (
                                        data.timesGerados.reservas.map((r) => (
                                            <div className="ptdTeamRow" key={r.usuarioId}>
                                                <div className="ptdTeamName">{r.nome}</div>
                                                <div className="ptdTeamNota">{r.nota}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Fluxo 6: admin libera avaliação */}
                        {souAdminDaEquipe && listaFechada && (
                            <div className="ptdFooterBox">
                                <div className="ptdFooterTitle">Avaliação</div>
                                <div className="ptdFooterText">
                                    Lista fechada. Libere a avaliação para os jogadores enviarem notas.
                                </div>
                                <button
                                    className="ptdBtn"
                                    type="button"
                                    onClick={onLiberarAvaliacao}
                                    disabled={liberandoAvaliacao}
                                >
                                    {liberandoAvaliacao ? "..." : "Liberar avaliação"}
                                </button>
                            </div>
                        )}

                        {/* Fluxo 6: avaliação liberada */}
                        {avaliacaoLiberada && (
                            <div className="ptdFooterBox">
                                <div className="ptdFooterTitle">Avaliação liberada</div>
                                <div className="ptdFooterText">Agora os jogadores podem enviar avaliações (batch).</div>

                                <button
                                    className="ptdBtn primary"
                                    type="button"
                                    onClick={() => nav(`/partidas/${data.id}/avaliar`)}
                                >
                                    Avaliar agora
                                </button>

                                {souAdminDaEquipe && (
                                    <button
                                        className="ptdBtn"
                                        type="button"
                                        onClick={onEncerrarAvaliacao}
                                        disabled={encerrandoAvaliacao}
                                    >
                                        {encerrandoAvaliacao ? "..." : "Encerrar avaliação"}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="ptdFooterBox">
                        <div className="ptdFooterTitle">Times</div>
                        <div className="ptdFooterText">Ainda não foram gerados.</div>

                        {souAdminDaEquipe ? (
                            <button
                                className="ptdBtn"
                                type="button"
                                onClick={onFecharListaEGerarTimes}
                                disabled={!partidaAberta || generating}
                            >
                                {generating ? "..." : "Fechar lista e gerar times"}
                            </button>
                        ) : (
                            <div className="ptdFooterText muted">
                                Apenas administradores podem fechar a lista e gerar times.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}