// src/pages/EquipeDetalhePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "../styles/equipedet.css";

import { getEquipe } from "../services/equipe";
import { getEu } from "../services/eu";
import { promoverAdmin, rebaixarMembro, removerMembro } from "../services/membrosEquipe";

import type { EquipeDetalhe } from "../services/equipe";

function fmtISOToBR(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("pt-BR");
}

function isAdminRole(papel?: string) {
    return papel === "ADMIN" || papel === "ADMINISTRADOR";
}

type ConfirmState =
    | null
    | {
        kind: "PROMOVER" | "REBAIXAR" | "REMOVER";
        usuarioId: number;
        nome: string;
        papel?: string;
    };

export default function EquipeDetalhePage() {
    const nav = useNavigate();
    const { equipeId } = useParams();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [okMsg, setOkMsg] = useState<string | null>(null);

    const [data, setData] = useState<EquipeDetalhe | null>(null);

    const [euId, setEuId] = useState<number | null>(null);
    const [souAdmin, setSouAdmin] = useState(false);

    const [busyUserId, setBusyUserId] = useState<number | null>(null);
    const [confirm, setConfirm] = useState<ConfirmState>(null);

    // ===== PAGINAÇÃO =====
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    async function load() {
        try {
            setErr(null);
            setOkMsg(null);
            setLoading(true);

            if (!equipeId) {
                setErr("ID de equipe ausente.");
                return;
            }

            const [eu, equipe] = await Promise.all([getEu(), getEquipe(equipeId)]);

            setEuId(eu.id);
            setData(equipe);

            const meu = (equipe.membros ?? []).find((m) => m.usuarioId === eu.id);
            setSouAdmin(isAdminRole(meu?.papel));

            // garante que a página não fique inválida após reload
            setPage((p) => Math.max(1, p));
        } catch (e: any) {
            const status = e?.response?.status;
            const resData = e?.response?.data;

            setErr(status ? `Erro (HTTP ${status}): ${JSON.stringify(resData)}` : "Falha de rede / backend fora.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipeId]);

    const membros = useMemo(() => data?.membros ?? [], [data]);

    const membrosAtivos = useMemo(() => membros.filter((m) => m.ativo).length, [membros]);

    const adminsAtivos = useMemo(() => membros.filter((m) => m.ativo && isAdminRole(m.papel)).length, [membros]);

    // ===== PAGINAÇÃO DERIVADOS =====
    const totalMembros = membros.length;

    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalMembros / PAGE_SIZE)), [totalMembros]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
        if (page < 1) setPage(1);
    }, [page, totalPages]);

    const pageStart = (page - 1) * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, totalMembros);

    const membrosPaginados = useMemo(() => membros.slice(pageStart, pageEnd), [membros, pageStart, pageEnd]);

    async function doPromover(usuarioId: number) {
        if (!data) return;
        setBusyUserId(usuarioId);

        try {
            await promoverAdmin(data.id, usuarioId);
            setOkMsg("Usuário promovido a administrador.");
            await load();
        } catch {
            setErr("Falha ao promover administrador.");
        } finally {
            setBusyUserId(null);
        }
    }

    async function doRebaixar(usuarioId: number) {
        if (!data) return;

        if (adminsAtivos <= 1) {
            setErr("Não é possível rebaixar o último administrador.");
            return;
        }

        setBusyUserId(usuarioId);

        try {
            await rebaixarMembro(data.id, usuarioId);
            setOkMsg("Administrador rebaixado para membro.");
            await load();
        } catch {
            setErr("Falha ao rebaixar membro.");
        } finally {
            setBusyUserId(null);
        }
    }

    async function doRemover(usuarioId: number) {
        if (!data) return;
        setBusyUserId(usuarioId);

        try {
            await removerMembro(data.id, usuarioId);
            setOkMsg("Membro removido.");
            await load();
        } catch {
            setErr("Falha ao remover membro.");
        } finally {
            setBusyUserId(null);
        }
    }

    async function handleConfirmAction() {
        if (!confirm) return;
        const { kind, usuarioId } = confirm;

        setConfirm(null);

        if (kind === "PROMOVER") return doPromover(usuarioId);
        if (kind === "REBAIXAR") return doRebaixar(usuarioId);
        if (kind === "REMOVER") return doRemover(usuarioId);
    }

    if (loading) {
        return (
            <div className="ed2Shell">
                <div className="ed2Card ed2Center">
                    <div className="ed2Spinner" />
                    <div className="ed2Muted">Carregando equipe...</div>
                </div>
            </div>
        );
    }

    if (err) {
        return (
            <div className="ed2Shell">
                <div className="ed2Card">
                    <div className="ed2Top">
                        <button className="ed2IconBtn" onClick={() => nav(-1)} aria-label="Voltar">
                            ←
                        </button>

                        <div className="ed2Brand">
                            <img className="ed2Logo" src="/logo-oficial.png" alt="Logo" />
                            <div className="ed2TitleWrap">
                                <div className="ed2Title">Detalhes da equipe</div>
                                <div className="ed2Muted">Administração e membros</div>
                            </div>
                        </div>

                        <div />
                    </div>

                    <div className="ed2Alert ed2AlertErr">
                        <div className="ed2AlertTitle">Erro</div>
                        <div className="ed2AlertText">{err}</div>
                    </div>

                    <div className="ed2ActionsRow">
                        <button className="ed2Btn" onClick={() => nav(-1)}>
                            Voltar
                        </button>
                        <button className="ed2Btn ed2BtnGhost" onClick={() => load()}>
                            Tentar novamente
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const criadoEm = fmtISOToBR((data as any)?.criadoEm);
    const criadoPor = (data as any)?.criadoPorUsuarioId;

    return (
        <div className="ed2Shell">
            <div className="ed2Card">
                {/* TOP */}
                <div className="ed2Top">
                    <button className="ed2IconBtn" onClick={() => nav(-1)} aria-label="Voltar">
                        ←
                    </button>

                    <div className="ed2Brand">
                        <img className="ed2Logo" src="/logo-oficial.png" alt="Logo" />
                        <div className="ed2TitleWrap">
                            <div className="ed2Title">Detalhes da equipe</div>
                            <div className="ed2Muted">Administração e membros</div>
                        </div>
                    </div>

                    <button className="ed2IconBtn" onClick={() => load()} aria-label="Recarregar">
                        ↻
                    </button>
                </div>

                {/* HERO */}
                <div className="ed2Hero">
                    <div className="ed2HeroBg" />
                    <img className="ed2HeroImg" src="/quadra.png" alt="Quadra" />
                    <div className="ed2HeroOverlay" />

                    <div className="ed2HeroContent">
                        <div className="ed2HeroLeft">
                            <div className="ed2TeamName">{data.nome}</div>
                            <div className="ed2TeamSub">
                                <span className="ed2Dot" />
                                <span className="ed2TeamLoc">{data.cepOuLocal}</span>
                            </div>

                            <div className="ed2Pills">
                                <span className="ed2Pill">{data.esporte}</span>
                                <span className="ed2Pill ed2PillSoft">{data.statusEquipe}</span>
                                {souAdmin ? (
                                    <span className="ed2Pill ed2PillAdmin">Você é admin</span>
                                ) : (
                                    <span className="ed2Pill ed2PillSoft">Você é membro</span>
                                )}
                            </div>
                        </div>

                        <div className="ed2HeroRight">
                            <div className="ed2Stat">
                                <div className="ed2StatLabel">Membros ativos</div>
                                <div className="ed2StatValue">
                                    {membrosAtivos}
                                    <span className="ed2StatSmall">/ {membros.length}</span>
                                </div>
                            </div>

                            <div className="ed2Stat">
                                <div className="ed2StatLabel">Admins ativos</div>
                                <div className="ed2StatValue">{adminsAtivos}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {(okMsg || err) && (
                    <div className={`ed2Alert ${okMsg ? "ed2AlertOk" : "ed2AlertErr"}`}>
                        <div>
                            <div className="ed2AlertTitle">{okMsg ? "Sucesso" : "Erro"}</div>
                            <div className="ed2AlertText">{okMsg || err}</div>
                        </div>

                        <button className="ed2AlertClose" onClick={() => (okMsg ? setOkMsg(null) : setErr(null))}>
                            ×
                        </button>
                    </div>
                )}

                {/* Info grid */}
                <div className="ed2InfoGrid">
                    <div className="ed2InfoItem">
                        <div className="ed2InfoLabel">Dias/Horários</div>
                        <div className="ed2InfoValue">{data.diasHorariosPadrao || "—"}</div>
                    </div>

                    {criadoEm && (
                        <div className="ed2InfoItem">
                            <div className="ed2InfoLabel">Criado em</div>
                            <div className="ed2InfoValue">{criadoEm}</div>
                        </div>
                    )}

                    {criadoPor && (
                        <div className="ed2InfoItem">
                            <div className="ed2InfoLabel">Criado por</div>
                            <div className="ed2InfoValue">{String(criadoPor)}</div>
                        </div>
                    )}

                    <div className="ed2InfoItem">
                        <div className="ed2InfoLabel">Acesso</div>
                        <div className="ed2InfoValue">{souAdmin ? "Administrador" : "Membro"}</div>
                    </div>
                </div>

                {/* Members header */}
                <div className="ed2SectionHead">
                    <div>
                        <div className="ed2SectionTitle">Membros</div>
                        <div className="ed2Muted">Ações só aparecem para administradores.</div>
                    </div>

                    <div className="ed2SectionRight">
                        <span className="ed2CountBadge">{membros.length} no total</span>
                    </div>
                </div>

                {/* PAGER (só se > 10) */}
                {totalMembros > PAGE_SIZE && (
                    <div className="ed2Pager">
                        <div className="ed2PagerInfo">
                            Mostrando <b>{pageStart + 1}</b>–<b>{pageEnd}</b> de <b>{totalMembros}</b>
                        </div>

                        <div className="ed2PagerBtns">
                            <button className="ed2BtnSmall ed2BtnGhost" onClick={() => setPage(1)} disabled={page === 1} title="Primeira">
                                «
                            </button>

                            <button
                                className="ed2BtnSmall ed2BtnGhost"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                title="Anterior"
                            >
                                ←
                            </button>

                            <div className="ed2PagerPage">
                                Página <b>{page}</b> / <b>{totalPages}</b>
                            </div>

                            <button
                                className="ed2BtnSmall ed2BtnGhost"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                title="Próxima"
                            >
                                →
                            </button>

                            <button
                                className="ed2BtnSmall ed2BtnGhost"
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                title="Última"
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}

                {/* Members list */}
                <div className="ed2List">
                    {membrosPaginados.map((m) => {
                        const isMe = euId === m.usuarioId;
                        const canManage = souAdmin && !isMe;

                        const roleLabel = isAdminRole(m.papel) ? "Admin" : "Membro";
                        const activeLabel = m.ativo ? "Ativo" : "Inativo";

                        return (
                            <div key={m.usuarioId} className={`ed2Row ${m.ativo ? "isActive" : "isInactive"}`}>
                                <div className="ed2RowMain">
                                    <div className="ed2Avatar" aria-hidden="true">
                                        {String(m.nome || "?").trim().charAt(0).toUpperCase()}
                                    </div>

                                    <div className="ed2RowText">
                                        <div className="ed2RowName">
                                            {m.nome}
                                            {isMe && <span className="ed2MeTag">você</span>}
                                        </div>

                                        <div className="ed2RowMeta">
                                            <span className={`ed2Tag ${isAdminRole(m.papel) ? "ed2TagAdmin" : "ed2TagSoft"}`}>{roleLabel}</span>
                                            <span className={`ed2Tag ${m.ativo ? "ed2TagOk" : "ed2TagSoft"}`}>{activeLabel}</span>
                                            <span className="ed2Tag ed2TagSoft">ID: {m.usuarioId}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ed2RowActions">
                                    {canManage ? (
                                        <>
                                            {isAdminRole(m.papel) ? (
                                                <button
                                                    className="ed2BtnSmall ed2BtnGhost"
                                                    disabled={busyUserId === m.usuarioId}
                                                    onClick={() => setConfirm({ kind: "REBAIXAR", usuarioId: m.usuarioId, nome: m.nome, papel: m.papel })}
                                                    title="Rebaixar para membro"
                                                >
                                                    Rebaixar
                                                </button>
                                            ) : (
                                                <button
                                                    className="ed2BtnSmall"
                                                    disabled={busyUserId === m.usuarioId}
                                                    onClick={() => setConfirm({ kind: "PROMOVER", usuarioId: m.usuarioId, nome: m.nome, papel: m.papel })}
                                                    title="Promover para administrador"
                                                >
                                                    Promover
                                                </button>
                                            )}

                                            <button
                                                className="ed2BtnSmall ed2BtnDanger"
                                                disabled={busyUserId === m.usuarioId}
                                                onClick={() => setConfirm({ kind: "REMOVER", usuarioId: m.usuarioId, nome: m.nome, papel: m.papel })}
                                                title="Remover membro"
                                            >
                                                Remover
                                            </button>
                                        </>
                                    ) : (
                                        <span className="ed2Muted">—</span>
                                    )}
                                </div>

                                {busyUserId === m.usuarioId && <div className="ed2RowBusy" aria-hidden="true" />}
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="ed2Footer">
                    <button className="ed2Btn ed2BtnGhost" onClick={() => nav(-1)}>
                        Voltar
                    </button>

                    <button className="ed2Cta" onClick={() => nav(`/equipes/${data.id}/partidas`)}>
                        Ver partidas <span className="ed2Arrow">→</span>
                    </button>
                </div>
            </div>

            {/* CONFIRM MODAL */}
            {confirm && (
                <div className="ed2ModalOverlay" role="dialog" aria-modal="true">
                    <div className="ed2Modal">
                        <div className="ed2ModalTitle">Confirmar ação</div>

                        <div className="ed2ModalText">
                            {confirm.kind === "PROMOVER" && (
                                <>
                                    Promover <b>{confirm.nome}</b> para <b>administrador</b>?
                                </>
                            )}
                            {confirm.kind === "REBAIXAR" && (
                                <>
                                    Rebaixar <b>{confirm.nome}</b> para <b>membro</b>?
                                </>
                            )}
                            {confirm.kind === "REMOVER" && (
                                <>
                                    Remover <b>{confirm.nome}</b> da equipe?
                                </>
                            )}
                        </div>

                        {confirm.kind === "REBAIXAR" && adminsAtivos <= 1 && (
                            <div className="ed2ModalWarn">Você não pode rebaixar o último administrador.</div>
                        )}

                        <div className="ed2ModalActions">
                            <button className="ed2BtnSmall ed2BtnGhost" onClick={() => setConfirm(null)}>
                                Cancelar
                            </button>

                            <button
                                className={`ed2BtnSmall ${confirm.kind === "REMOVER" ? "ed2BtnDanger" : ""}`}
                                onClick={handleConfirmAction}
                                disabled={busyUserId === confirm.usuarioId || (confirm.kind === "REBAIXAR" && adminsAtivos <= 1)}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}