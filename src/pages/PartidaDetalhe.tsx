// src/pages/PartidaDetalhePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "../styles/partidaDetalhe.css";

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

function cap(s: string) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDataHoraParts(iso?: string) {
    if (!iso) return { weekday: "—", date: "—", time: "—" };

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { weekday: "—", date: "—", time: "—" };

    const weekday = cap(d.toLocaleDateString("pt-BR", { weekday: "long" }));

    const date = d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    const time = d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return { weekday, date, time };
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

    return status ? `Erro (HTTP ${status}): ${msg}` : "Falha de rede / CORS / backend fora.";
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

    // paginação presenças
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

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
                const admRes = await api.get<EquipeAdminResumo[]>("/eu/equipes-administrador");
                const lista = admRes.data ?? [];
                setSouAdminDaEquipe(lista.some((e) => e.id === d.equipeId));
            } catch {
                setSouAdminDaEquipe((euRes.data?.id ?? null) === d.criadoPorUsuarioId);
            }

            setPage((p) => Math.max(1, p));
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

    const when = useMemo(() => fmtDataHoraParts(data?.dataHora), [data?.dataHora]);

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
    const vagas = useMemo(() => (limite > 0 ? Math.max(0, limite - confirmados) : null), [limite, confirmados]);

    const partidaAberta = data?.statusPartida === "ABERTA";
    const listaFechada = data?.statusPartida === "LISTA_FECHADA";
    const avaliacaoLiberada = data?.statusPartida === "AVALIACAO_LIBERADA";

    const podeConfirmar = !!data && partidaAberta && !estouConfirmado && (limite === 0 || confirmados < limite);
    const podeCancelar = !!data && partidaAberta && estouConfirmado;

    // ===== PAGINAÇÃO PRESENÇAS =====
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

    if (loading) {
        return (
            <div className="ptd2Shell">
                <div className="ptd2Card ptd2Center">
                    <div className="ptd2Spinner" />
                    <div className="ptd2Muted">Carregando partida...</div>
                </div>
            </div>
        );
    }

    if (err) {
        return (
            <div className="ptd2Shell">
                <div className="ptd2Card">
                    <div className="ptd2Top">
                        <button className="ptd2IconBtn" onClick={() => nav(-1)} type="button" aria-label="Voltar">
                            ←
                        </button>

                        <div className="ptd2Brand">
                            <img className="ptd2Logo" src="/logo-oficial.png" alt="Logo" />
                            <div className="ptd2TitleWrap">
                                <div className="ptd2Title">Detalhes da partida</div>
                                <div className="ptd2Muted">Status, presenças e times</div>
                            </div>
                        </div>

                        <div className="ptd2TopRight">
                            <button
                                className="ptd2BtnSmall ptd2BtnGhost"
                                type="button"
                                onClick={() => nav(`/equipes/${data?.equipeId ?? ""}`)}
                            >
                                Equipe
                            </button>
                        </div>
                    </div>

                    <div className="ptd2Alert ptd2AlertErr">
                        <div>
                            <div className="ptd2AlertTitle">Erro</div>
                            <div className="ptd2AlertText">{err}</div>
                        </div>
                    </div>

                    <div className="ptd2Footer">
                        <button className="ptd2Btn ptd2BtnGhost" type="button" onClick={() => nav(-1)}>
                            Voltar
                        </button>
                        <button className="ptd2Btn" type="button" onClick={load}>
                            Tentar novamente
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="ptd2Shell">
            <div className="ptd2Card">
                {/* TOP */}
                <div className="ptd2Top">
                    <button className="ptd2IconBtn" onClick={() => nav(-1)} type="button" aria-label="Voltar">
                        ←
                    </button>

                    <div className="ptd2Brand">
                        <img className="ptd2Logo" src="/logo-oficial.png" alt="Logo" />
                        <div className="ptd2TitleWrap">
                            <div className="ptd2Title">Detalhes da partida</div>
                            <div className="ptd2Muted">Status, presenças e times</div>
                        </div>
                    </div>

                    <div className="ptd2TopRight">
                        <button className="ptd2IconBtn" type="button" onClick={load} aria-label="Recarregar">
                            ↻
                        </button>
                        <button className="ptd2BtnSmall ptd2BtnGhost" type="button" onClick={() => nav(`/equipes/${data.equipeId}`)}>
                            Equipe
                        </button>
                    </div>
                </div>

                {/* HERO */}
                <div className="ptd2Hero">
                    <div className="ptd2HeroBg" />
                    <img className="ptd2HeroImg" src="/quadra-areia.jpg" alt="Quadra" />
                    <div className="ptd2HeroOverlay" />

                    <div className="ptd2HeroContent">
                        <div className="ptd2HeroLeft">
                            {/* NOVO BLOCO DE DATA/HORA */}
                            <div className="ptd2When">
                                <div className="ptd2WhenTop">
                                    <span className="ptd2WhenDot" aria-hidden="true" />
                                    <span className="ptd2WhenWeekday">{when.weekday}</span>
                                </div>

                                <div className="ptd2WhenDate">{when.date}</div>

                                <div className="ptd2WhenBottom">
                                    <span className="ptd2WhenPill">⏰ {when.time}</span>
                                    <span className="ptd2WhenPill soft">Partida #{data.id}</span>
                                </div>
                            </div>

                            <div className="ptd2Pills">
                                <span className="ptd2Pill">{data.statusPartida}</span>
                                <span className="ptd2Pill ptd2PillSoft">{data.politicaInscricao}</span>
                                {souAdminDaEquipe ? (
                                    <span className="ptd2Pill ptd2PillAdmin">Você é admin</span>
                                ) : (
                                    <span className="ptd2Pill ptd2PillSoft">Você é membro</span>
                                )}
                            </div>
                        </div>

                        <div className="ptd2HeroRight">
                            <div className="ptd2Stat">
                                <div className="ptd2StatLabel">Partida</div>
                                <div className="ptd2StatValue">#{data.id}</div>
                            </div>

                            <div className="ptd2Stat">
                                <div className="ptd2StatLabel">Confirmados</div>
                                <div className="ptd2StatValue">{confirmados}</div>
                            </div>

                            <div className="ptd2Stat">
                                <div className="ptd2StatLabel">Vagas</div>
                                <div className="ptd2StatValue">{vagas === null ? "—" : String(vagas)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {(ok || err) && (
                    <div className={`ptd2Alert ${ok ? "ptd2AlertOk" : "ptd2AlertErr"}`}>
                        <div>
                            <div className="ptd2AlertTitle">{ok ? "Sucesso" : "Erro"}</div>
                            <div className="ptd2AlertText">{ok ?? err}</div>
                        </div>
                        <button className="ptd2AlertClose" onClick={() => (ok ? setOk(null) : setErr(null))} aria-label="Fechar">
                            ×
                        </button>
                    </div>
                )}

                {/* META GRID */}
                <div className="ptd2InfoGrid">
                    <div className="ptd2InfoItem">
                        <div className="ptd2InfoLabel">Jogadores/Time</div>
                        <div className="ptd2InfoValue">{String(data.jogadoresPorTime)}</div>
                    </div>

                    <div className="ptd2InfoItem">
                        <div className="ptd2InfoLabel">Limite</div>
                        <div className="ptd2InfoValue">{data.limiteParticipantes ? String(data.limiteParticipantes) : "Sem limite"}</div>
                    </div>

                    <div className="ptd2InfoItem">
                        <div className="ptd2InfoLabel">Criado em</div>
                        <div className="ptd2InfoValue">{fmtISO(data.criadoEm)}</div>
                    </div>

                    <div className="ptd2InfoItem">
                        <div className="ptd2InfoLabel">Equipe</div>
                        <div className="ptd2InfoValue">#{String(data.equipeId)}</div>
                    </div>
                </div>

                {/* CTA presença */}
                <div className="ptd2SectionHead">
                    <div>
                        <div className="ptd2SectionTitle">Presenças</div>
                        <div className="ptd2Muted">Confirme/cancele enquanto estiver ABERTA.</div>
                    </div>

                    <div className="ptd2SectionRight">
                        <span className="ptd2CountBadge">
                            Presença: <b>{minhaPresenca ? minhaPresenca.statusPresenca : "—"}</b>
                        </span>
                    </div>
                </div>

                <div className="ptd2CtaRow">
                    <button className="ptd2Btn primary" type="button" onClick={onConfirmar} disabled={!podeConfirmar || acting}>
                        {acting ? "..." : "Confirmar"}
                    </button>

                    <button className="ptd2Btn ptd2BtnGhost" type="button" onClick={onCancelar} disabled={!podeCancelar || acting}>
                        {acting ? "..." : "Cancelar"}
                    </button>

                    <button className="ptd2Btn ptd2BtnGhost" type="button" onClick={() => nav(`/equipes/${data.equipeId}`)}>
                        Ver equipe
                    </button>
                </div>

                {/* PAGER presenças */}
                {totalPresencas > PAGE_SIZE && (
                    <div className="ptd2Pager">
                        <div className="ptd2PagerInfo">
                            Mostrando <b>{pageStart + 1}</b>–<b>{pageEnd}</b> de <b>{totalPresencas}</b>
                        </div>

                        <div className="ptd2PagerBtns">
                            <button className="ptd2BtnSmall ptd2BtnGhost" onClick={() => setPage(1)} disabled={page === 1} title="Primeira">
                                «
                            </button>

                            <button
                                className="ptd2BtnSmall ptd2BtnGhost"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                title="Anterior"
                            >
                                ←
                            </button>

                            <div className="ptd2PagerPage">
                                Página <b>{page}</b> / <b>{totalPages}</b>
                            </div>

                            <button
                                className="ptd2BtnSmall ptd2BtnGhost"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                title="Próxima"
                            >
                                →
                            </button>

                            <button
                                className="ptd2BtnSmall ptd2BtnGhost"
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                title="Última"
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}

                {/* PRESENÇAS LIST */}
                <div className="ptd2List">
                    {totalPresencas === 0 ? (
                        <div className="ptd2Empty">Sem presenças.</div>
                    ) : (
                        presencasPaginadas.map((p) => {
                            const isMe = meuId === p.usuarioId;
                            const isOk = p.statusPresenca === "CONFIRMADO";

                            return (
                                <div key={p.usuarioId} className={`ptd2Row ${isOk ? "isOk" : "isSoft"}`}>
                                    <div className="ptd2RowMain">
                                        <div className="ptd2Avatar" aria-hidden="true">
                                            {String(p.nome || "?").trim().charAt(0).toUpperCase()}
                                        </div>

                                        <div className="ptd2RowText">
                                            <div className="ptd2RowName">
                                                {p.nome}
                                                {isMe && <span className="ptd2MeTag">você</span>}
                                            </div>

                                            <div className="ptd2RowMeta">
                                                <span className={`ptd2Tag ${isOk ? "ptd2TagOk" : "ptd2TagSoft"}`}>{p.statusPresenca}</span>
                                                <span className="ptd2Tag ptd2TagSoft">ID: {p.usuarioId}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ptd2RowRight">{isOk ? <span className="ptd2DotOk" /> : <span className="ptd2DotSoft" />}</div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* TIMES / AVALIAÇÃO */}
                <div className="ptd2SectionHead">
                    <div>
                        <div className="ptd2SectionTitle">Times</div>
                    </div>

                    <div className="ptd2SectionRight">
                        <span className="ptd2CountBadge">{data.timesGerados ? "Gerados" : "Pendente"}</span>
                    </div>
                </div>

                {data.timesGerados ? (
                    <>
                        <div className="ptd2TimesMeta">
                            <div className="ptd2TimesLine">
                                <span>Gerado em</span>
                                <strong>{fmtISO(data.timesGerados.geradoEm)}</strong>
                            </div>
                        </div>

                        <div className="ptd2TimesGrid">
                            {data.timesGerados.times.map((t) => (
                                <div className="ptd2TeamCard" key={t.numero}>
                                    <div className="ptd2TeamTitle">Time {t.numero}</div>
                                    <div className="ptd2TeamList">
                                        {t.jogadores.map((j) => (
                                            <div className="ptd2TeamRow" key={j.usuarioId}>
                                                <div className="ptd2TeamName">{j.nome}</div>
                                                <div className="ptd2TeamNota">{j.nota}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="ptd2TeamCard">
                                <div className="ptd2TeamTitle">Reservas</div>
                                <div className="ptd2TeamList">
                                    {data.timesGerados.reservas.length === 0 ? (
                                        <div className="ptd2Empty">Sem reservas.</div>
                                    ) : (
                                        data.timesGerados.reservas.map((r) => (
                                            <div className="ptd2TeamRow" key={r.usuarioId}>
                                                <div className="ptd2TeamName">{r.nome}</div>
                                                <div className="ptd2TeamNota">{r.nota}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Lista fechada -> admin libera avaliação */}
                        {souAdminDaEquipe && listaFechada && (
                            <div className="ptd2FooterBox">
                                <div className="ptd2FooterTitle">Avaliação</div>
                                <div className="ptd2FooterText">Lista fechada. Libere a avaliação para os jogadores enviarem notas.</div>

                                <button className="ptd2Btn" type="button" onClick={onLiberarAvaliacao} disabled={liberandoAvaliacao}>
                                    {liberandoAvaliacao ? "..." : "Liberar avaliação"}
                                </button>
                            </div>
                        )}

                        {/* Avaliação liberada */}
                        {avaliacaoLiberada && (
                            <div className="ptd2FooterBox">
                                <div className="ptd2FooterTitle">Avaliação liberada</div>
                                <div className="ptd2FooterText">Agora os jogadores podem enviar avaliações.</div>

                                <button className="ptd2Btn primary" type="button" onClick={() => nav(`/partidas/${data.id}/avaliar`)}>
                                    Avaliar agora
                                </button>

                                {souAdminDaEquipe && (
                                    <button className="ptd2Btn ptd2BtnGhost" type="button" onClick={onEncerrarAvaliacao} disabled={encerrandoAvaliacao}>
                                        {encerrandoAvaliacao ? "..." : "Encerrar avaliação"}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="ptd2FooterBox">
                        <div className="ptd2FooterTitle">Times</div>
                        <div className="ptd2FooterText">Ainda não foram gerados.</div>

                        {souAdminDaEquipe ? (
                            <button className="ptd2Btn" type="button" onClick={onFecharListaEGerarTimes} disabled={!partidaAberta || generating}>
                                {generating ? "..." : "Fechar lista e gerar times"}
                            </button>
                        ) : (
                            <div className="ptd2FooterText ptd2Muted">Apenas administradores podem fechar a lista e gerar times.</div>
                        )}
                    </div>
                )}

                <div className="ptd2Footer">
                    <button className="ptd2Btn ptd2BtnGhost" type="button" onClick={() => nav(-1)}>
                        Voltar
                    </button>

                    <button className="ptd2Btn" type="button" onClick={() => nav(`/equipes/${data.equipeId}`)}>
                        Abrir equipe
                    </button>
                </div>
            </div>
        </div>
    );
}