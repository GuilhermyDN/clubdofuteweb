// src/pages/EquipePartidasPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "../styles/EquipePartidasPage.css";

import { getEquipe } from "../services/equipe";
import {
    criarPartidaEquipe,
    listarPartidasEquipe,
    type CriarPartidaBody,
    type PartidaResumo,
    type PoliticaInscricao,
} from "../services/equipePartidas";
import { api } from "../services/api";

type EuResponse = {
    id: number;
    nome?: string;
};

function fmtDataHora(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR");
}

function toLocalInputValue(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

function toIsoFromDatetimeLocal(v: string) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

function explainAxiosError(e: any) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    if (status) return `Erro (HTTP ${status}): ${JSON.stringify(data)}`;
    return "Falha de rede / CORS / backend fora.";
}

export default function EquipePartidasPage() {
    const { equipeId } = useParams();
    const nav = useNavigate();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const [partidas, setPartidas] = useState<PartidaResumo[]>([]);
    const [souAdmin, setSouAdmin] = useState(false);

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<CriarPartidaBody>(() => ({
        dataHora: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        politicaInscricao: "SOMENTE_MEMBROS",
        jogadoresPorTime: 4,
        limiteParticipantes: undefined,
    }));

    // ===== paginação =====
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    const dataHoraLocal = useMemo(() => {
        const d = new Date(form.dataHora);
        if (Number.isNaN(d.getTime())) return toLocalInputValue(new Date());
        return toLocalInputValue(d);
    }, [form.dataHora]);

    async function loadAll() {
        if (!equipeId) {
            setErr("ID da equipe ausente.");
            setLoading(false);
            return;
        }

        setErr(null);
        setOk(null);
        setLoading(true);

        try {
            // 1) meu usuario
            const euRes = await api.get<EuResponse>("/eu");
            const meuId = euRes.data?.id;

            // 2) equipe p/ descobrir papel
            const equipe = await getEquipe(equipeId);

            const isAdmin =
                !!meuId &&
                (equipe.membros ?? []).some((m) => {
                    const papel = String((m as any).papel ?? "").toUpperCase();
                    const isAdminRole = papel === "ADMIN" || papel === "ADMINISTRADOR";
                    return m.usuarioId === meuId && m.ativo && isAdminRole;
                });

            setSouAdmin(isAdmin);

            // 3) partidas
            const list = await listarPartidasEquipe(equipeId);
            setPartidas(list ?? []);

            // se a lista mudou e a página ficou inválida, conserta
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
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipeId]);

    const totalPartidas = partidas.length;

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(totalPartidas / PAGE_SIZE));
    }, [totalPartidas]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
        if (page < 1) setPage(1);
    }, [page, totalPages]);

    const pageStart = (page - 1) * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, totalPartidas);

    const partidasPaginadas = useMemo(() => {
        return partidas.slice(pageStart, pageEnd);
    }, [partidas, pageStart, pageEnd]);

    const totalConfirmados = useMemo(() => {
        return (partidas ?? []).reduce((acc, p) => acc + Number((p as any).totalConfirmados ?? 0), 0);
    }, [partidas]);

    const proximas = useMemo(() => {
        const now = Date.now();
        return (partidas ?? []).filter((p) => {
            const t = new Date(p.dataHora).getTime();
            return !Number.isNaN(t) && t >= now;
        }).length;
    }, [partidas]);

    async function onCriarPartida() {
        if (!equipeId) return;

        setErr(null);
        setOk(null);

        if (!souAdmin) {
            setErr("Você não é ADMIN desta equipe (segundo o backend).");
            return;
        }

        const iso = toIsoFromDatetimeLocal(dataHoraLocal);
        if (!iso) {
            setErr("Data/Hora inválida.");
            return;
        }

        const body: CriarPartidaBody = {
            dataHora: iso,
            politicaInscricao: form.politicaInscricao as PoliticaInscricao,
            jogadoresPorTime: Number(form.jogadoresPorTime),
            limiteParticipantes:
                form.limiteParticipantes === undefined ||
                    form.limiteParticipantes === null ||
                    (form.limiteParticipantes as any) === ""
                    ? undefined
                    : Number(form.limiteParticipantes),
        };

        if (!body.politicaInscricao) return setErr("Política é obrigatória.");
        if (!body.jogadoresPorTime || body.jogadoresPorTime <= 0) return setErr("Jogadores por time deve ser > 0.");
        if (body.limiteParticipantes !== undefined && body.limiteParticipantes < 0) return setErr("Limite não pode ser negativo.");

        try {
            setCreating(true);
            await criarPartidaEquipe(equipeId, body);
            setOk("Partida criada.");
            await loadAll();
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setCreating(false);
        }
    }

    if (loading) {
        return (
            <div className="pd2Shell">
                <div className="pd2Card pd2Center">
                    <div className="pd2Spinner" />
                    <div className="pd2Muted">Carregando partidas...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="pd2Shell">
            <div className="pd2Card">
                {/* TOP */}
                <div className="pd2Top">
                    <button className="pd2IconBtn" onClick={() => nav(-1)} type="button" aria-label="Voltar">
                        ←
                    </button>

                    <div className="pd2Brand">
                        <img className="pd2Logo" src="/logo-oficial.png" alt="Logo" />
                        <div className="pd2TitleWrap">
                            <div className="pd2Title">Partidas da equipe</div>
                            <div className="pd2Muted">Criação, métricas e histórico</div>
                        </div>
                    </div>

                    <div className="pd2TopRight">
                        <button className="pd2IconBtn" type="button" onClick={loadAll} aria-label="Recarregar">
                            ↻
                        </button>
                        <button className="pd2BtnSmall pd2BtnGhost" type="button" onClick={() => nav(`/equipes/${equipeId}`)}>
                            Equipe
                        </button>
                    </div>
                </div>

                {/* HERO */}
                <div className="pd2Hero">
                    <div className="pd2HeroBg" />
                    <img className="pd2HeroImg" src="/quadra.png" alt="Quadra" />
                    <div className="pd2HeroOverlay" />

                    <div className="pd2HeroContent">
                        <div className="pd2HeroLeft">
                            <div className="pd2HeroTitle">Central de Partidas</div>
                            <div className="pd2HeroSub">
                                {souAdmin ? (
                                    <span className="pd2Pill pd2PillAdmin">Você é admin</span>
                                ) : (
                                    <span className="pd2Pill pd2PillSoft">Você é membro</span>
                                )}
                                <span className="pd2Pill">Equipe #{String(equipeId)}</span>
                            </div>
                        </div>

                        <div className="pd2HeroRight">
                            <div className="pd2Stat">
                                <div className="pd2StatLabel">Total de partidas</div>
                                <div className="pd2StatValue">{totalPartidas}</div>
                            </div>

                            <div className="pd2Stat">
                                <div className="pd2StatLabel">Próximas</div>
                                <div className="pd2StatValue">{proximas}</div>
                            </div>

                            <div className="pd2Stat">
                                <div className="pd2StatLabel">Confirmados (somatório)</div>
                                <div className="pd2StatValue">{totalConfirmados}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MSG */}
                {(ok || err) && (
                    <div className={`pd2Alert ${ok ? "pd2AlertOk" : "pd2AlertErr"}`}>
                        <div>
                            <div className="pd2AlertTitle">{ok ? "Sucesso" : "Erro"}</div>
                            <div className="pd2AlertText">{ok ?? err}</div>
                        </div>
                        <button className="pd2AlertClose" onClick={() => (ok ? setOk(null) : setErr(null))} aria-label="Fechar">
                            ×
                        </button>
                    </div>
                )}

                {/* CRIAR */}
                <div className="pd2SectionHead">
                    <div>
                        <div className="pd2SectionTitle">Criar partida</div>
                        <div className="pd2Muted">Defina data, política e tamanho de times.</div>
                    </div>

                    <div className="pd2SectionRight">
                        <span className="pd2CountBadge">{souAdmin ? "Admin" : "Somente leitura"}</span>
                    </div>
                </div>

                {!souAdmin ? (
                    <div className="pd2Note">
                        Apenas administradores podem criar partidas.
                    </div>
                ) : (
                    <div className={`pd2Form ${creating ? "isBusy" : ""}`}>
                        <div className="pd2FormGrid">
                            <div className="pd2FieldCard">
                                <div className="pd2FieldLabel">Data/Hora</div>
                                <input
                                    className="pd2Field"
                                    type="datetime-local"
                                    value={dataHoraLocal}
                                    onChange={(e) => {
                                        const iso2 = toIsoFromDatetimeLocal(e.target.value);
                                        if (!iso2) return;
                                        setForm((p) => ({ ...p, dataHora: iso2 }));
                                    }}
                                />
                                <div className="pd2FieldHelp">Horário local do seu navegador.</div>
                            </div>

                            <div className="pd2FieldCard">
                                <div className="pd2FieldLabel">Política</div>
                                <select
                                    className="pd2Field"
                                    value={form.politicaInscricao}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            politicaInscricao: e.target.value as any,
                                        }))
                                    }
                                >
                                    <option value="SOMENTE_MEMBROS">SOMENTE_MEMBROS</option>
                                    <option value="AVULSOS_ABERTOS">AVULSOS_ABERTOS</option>
                                </select>
                                <div className="pd2FieldHelp">Quem pode entrar nessa partida.</div>
                            </div>

                            <div className="pd2FieldCard">
                                <div className="pd2FieldLabel">Jogadores por time</div>
                                <input
                                    className="pd2Field"
                                    type="number"
                                    min={1}
                                    value={String(form.jogadoresPorTime)}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            jogadoresPorTime: Number(e.target.value),
                                        }))
                                    }
                                />
                                <div className="pd2FieldHelp">Ex.: 4 significa 4x4.</div>
                            </div>

                            <div className="pd2FieldCard">
                                <div className="pd2FieldLabel">
                                    Limite participantes <span className="pd2Hint">(opcional)</span>
                                </div>
                                <input
                                    className="pd2Field"
                                    type="number"
                                    min={0}
                                    value={form.limiteParticipantes === undefined ? "" : String(form.limiteParticipantes)}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setForm((p) => ({
                                            ...p,
                                            limiteParticipantes: v === "" ? undefined : Number(v),
                                        }));
                                    }}
                                    placeholder="vazio = sem limite"
                                />
                                <div className="pd2FieldHelp">Se vazio, o backend não limita.</div>
                            </div>
                        </div>

                        <div className="pd2Actions">
                            <button className="pd2Btn primary" type="button" onClick={onCriarPartida} disabled={creating}>
                                {creating ? "Criando..." : "Criar partida"}
                            </button>

                            <button className="pd2Btn pd2BtnGhost" type="button" onClick={loadAll} disabled={creating}>
                                Recarregar
                            </button>
                        </div>

                        {creating && <div className="pd2FormBusy" aria-hidden="true" />}
                    </div>
                )}

                {/* LISTA */}
                <div className="pd2SectionHead">
                    <div>
                        <div className="pd2SectionTitle">Partidas</div>
                        <div className="pd2Muted">Clique numa partida para abrir os detalhes.</div>
                    </div>

                    <div className="pd2SectionRight">
                        <span className="pd2CountBadge">{totalPartidas} no total</span>
                    </div>
                </div>

                {totalPartidas > PAGE_SIZE && (
                    <div className="pd2Pager">
                        <div className="pd2PagerInfo">
                            Mostrando <b>{pageStart + 1}</b>–<b>{pageEnd}</b> de <b>{totalPartidas}</b>
                        </div>

                        <div className="pd2PagerBtns">
                            <button className="pd2BtnSmall pd2BtnGhost" onClick={() => setPage(1)} disabled={page === 1} title="Primeira">
                                «
                            </button>

                            <button
                                className="pd2BtnSmall pd2BtnGhost"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                title="Anterior"
                            >
                                ←
                            </button>

                            <div className="pd2PagerPage">
                                Página <b>{page}</b> / <b>{totalPages}</b>
                            </div>

                            <button
                                className="pd2BtnSmall pd2BtnGhost"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                title="Próxima"
                            >
                                →
                            </button>

                            <button
                                className="pd2BtnSmall pd2BtnGhost"
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                title="Última"
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}

                {partidas.length === 0 ? (
                    <div className="pd2Empty">Nenhuma partida criada ainda.</div>
                ) : (
                    <div className="pd2List">
                        {partidasPaginadas.map((p) => {
                            const iso = String(p.dataHora);
                            const d = new Date(iso);
                            const ts = d.getTime();
                            const now = Date.now();

                            const isValid = !Number.isNaN(ts);
                            const isFuture = isValid && ts >= now;
                            const badgeClass = isFuture ? "pd2BadgeFuture" : "pd2BadgePast";

                            return (
                                <div
                                    key={p.id}
                                    className="pd2Row"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => nav(`/partidas/${p.id}`)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") nav(`/partidas/${p.id}`);
                                    }}
                                >
                                    <div className="pd2RowLeft">
                                        <div className={`pd2Badge ${badgeClass}`}>{isFuture ? "Próxima" : "Histórico"}</div>

                                        <div className="pd2RowTitle">
                                            {p.statusPartida}
                                            <span className="pd2RowId">#{p.id}</span>
                                        </div>

                                        <div className="pd2RowSub">{fmtDataHora(p.dataHora)}</div>
                                    </div>

                                    <div className="pd2RowRight">
                                        <div className="pd2Metric">
                                            <div className="pd2MetricLabel">Confirmados</div>
                                            <div className="pd2MetricValue">{p.totalConfirmados}</div>
                                        </div>

                                        <div className="pd2Chevron">→</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="pd2Footer">
                    <button className="pd2Btn pd2BtnGhost" onClick={() => nav(-1)}>
                        Voltar
                    </button>

                    <button className="pd2Btn" onClick={() => nav(`/equipes/${equipeId}`)}>
                        Abrir equipe
                    </button>
                </div>
            </div>
        </div>
    );
}