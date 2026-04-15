import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEquipe, entrarEquipeAberta, entrarEquipeFechada } from "../services/equipe";
import { getEu } from "../services/eu";
import { promoverAdmin, rebaixarMembro, removerMembro } from "../services/membrosEquipe";
import type { EquipeDetalhe } from "../services/equipe";
import AppHeader from "../components/AppHeader";
import CountUp from "../components/CountUp";
import { toast } from "../components/Toast";
import { explainError, isAuthError } from "../utils/errors";

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
    | { kind: "PROMOVER" | "REBAIXAR" | "REMOVER"; usuarioId: number; nome: string; papel?: string };

export default function EquipeDetalhePage() {
    const nav = useNavigate();
    const { equipeId } = useParams();

    const [loading, setLoading] = useState(true);
    const [loadErr, setLoadErr] = useState<string | null>(null);
    const [data, setData] = useState<EquipeDetalhe | null>(null);
    const [euId, setEuId] = useState<number | null>(null);
    const [souAdmin, setSouAdmin] = useState(false);
    const [souMembro, setSouMembro] = useState(false);

    const [loadingEntrar, setLoadingEntrar] = useState(false);
    const [showSenhaModal, setShowSenhaModal] = useState(false);
    const [senhaInput, setSenhaInput] = useState("");

    const [busyUserId, setBusyUserId] = useState<number | null>(null);
    const [confirm, setConfirm] = useState<ConfirmState>(null);

    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    async function load() {
        try {
            setLoadErr(null);
            setLoading(true);
            if (!equipeId) { setLoadErr("ID de equipe ausente."); return; }
            const [eu, equipe] = await Promise.all([getEu(), getEquipe(equipeId)]);
            setEuId(eu.id);
            setData(equipe);
            const meu = (equipe.membros ?? []).find((m) => m.usuarioId === eu.id);
            setSouAdmin(isAdminRole(meu?.papel));
            setSouMembro(meu !== undefined);
            setPage((p) => Math.max(1, p));
        } catch (e: any) {
            if (isAuthError(e)) return;
            const msg = explainError(e);
            setLoadErr(msg);
            toast.error(msg, "Falha ao carregar equipe");
        } finally { setLoading(false); }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [equipeId]);

    const membros = useMemo(() => data?.membros ?? [], [data]);
    const membrosAtivos = useMemo(() => membros.filter((m) => m.ativo).length, [membros]);
    const adminsAtivos = useMemo(() => membros.filter((m) => m.ativo && isAdminRole(m.papel)).length, [membros]);
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
        try { await promoverAdmin(data.id, usuarioId); toast.success("Usuário promovido a administrador."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao promover"); }
        finally { setBusyUserId(null); }
    }
    async function doRebaixar(usuarioId: number) {
        if (!data) return;
        if (adminsAtivos <= 1) { toast.warn("Não é possível rebaixar o último administrador."); return; }
        setBusyUserId(usuarioId);
        try { await rebaixarMembro(data.id, usuarioId); toast.success("Administrador rebaixado."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao rebaixar"); }
        finally { setBusyUserId(null); }
    }
    async function doRemover(usuarioId: number) {
        if (!data) return;
        setBusyUserId(usuarioId);
        try { await removerMembro(data.id, usuarioId); toast.success("Membro removido."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao remover"); }
        finally { setBusyUserId(null); }
    }

    async function handleConfirmAction() {
        if (!confirm) return;
        const { kind, usuarioId } = confirm;
        setConfirm(null);
        if (kind === "PROMOVER") return doPromover(usuarioId);
        if (kind === "REBAIXAR") return doRebaixar(usuarioId);
        if (kind === "REMOVER") return doRemover(usuarioId);
    }

    async function handleEntrar() {
        if (!equipeId || !data) return;
        if (data.statusEquipe === "FECHADA") { setShowSenhaModal(true); return; }
        setLoadingEntrar(true);
        try {
            await entrarEquipeAberta(equipeId);
            toast.success("Você entrou na equipe!");
            await load();
        } catch (e: any) {
            if (!isAuthError(e)) toast.error(explainError(e), "Falha ao entrar");
        } finally { setLoadingEntrar(false); }
    }

    async function handleEntrarComSenha() {
        if (!equipeId) return;
        if (!senhaInput.trim()) { toast.warn("Informe a senha da equipe."); return; }
        setLoadingEntrar(true);
        setShowSenhaModal(false);
        try {
            await entrarEquipeFechada(equipeId, senhaInput);
            setSenhaInput("");
            toast.success("Você entrou na equipe!");
            await load();
        } catch (e: any) {
            if (!isAuthError(e)) toast.error(explainError(e), "Falha ao entrar");
        } finally { setLoadingEntrar(false); }
    }

    if (loading) {
        return (
            <div className="x-app">
                <AppHeader />
                <main className="x-app-main">
                    <div className="x-loading"><div className="x-spinner" /> Carregando equipe...</div>
                </main>
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
                                <button className="x-btn sm" onClick={() => load()}>Tentar novamente</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!data) return null;

    const criadoEm = fmtISOToBR((data as any)?.criadoEm);

    return (
        <div className="x-app">
            <AppHeader />

            <div className="x-phero">
                <div className="x-phero-inner">
                    <button className="x-phero-back" onClick={() => nav(-1)}>← Voltar</button>
                    <div className="x-phero-grid">
                        <div>
                            <h1 className="x-phero-title">{data.nome}</h1>
                            <div className="x-meta" style={{ marginBottom: 18 }}>{data.cepOuLocal}</div>
                            <div className="x-phero-meta">
                                <span className="x-pill">{data.esporte}</span>
                                <span className="x-pill">{data.statusEquipe}</span>
                                {souAdmin && <span className="x-pill accent">Você é admin</span>}
                                {!souAdmin && souMembro && <span className="x-pill success">Membro</span>}
                            </div>
                        </div>
                        <div className="x-phero-actions">
                            <button className="x-btn ghost sm" onClick={() => load()}>Recarregar</button>
                            {!souMembro && (
                                <button className="x-btn" onClick={handleEntrar} disabled={loadingEntrar}>
                                    {loadingEntrar ? "..." : "Entrar na equipe"}
                                </button>
                            )}
                            <button className="x-btn" onClick={() => nav(`/equipes/${data.id}/partidas`)}>
                                Ver partidas <span className="x-btn-arr">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="x-app-main">
                <div className="x-app-container">
                    {/* Stats */}
                    <div className="x-stats x-stagger" style={{ marginBottom: 32 }}>
                        <div className="x-stat x-reveal">
                            <div className="x-stat-lbl">Membros ativos</div>
                            <div className="x-stat-val"><CountUp to={membrosAtivos} /><em>/{totalMembros}</em></div>
                        </div>
                        <div className="x-stat x-reveal">
                            <div className="x-stat-lbl">Administradores</div>
                            <div className="x-stat-val"><CountUp to={adminsAtivos} /></div>
                        </div>
                        <div className="x-stat x-reveal">
                            <div className="x-stat-lbl">Agenda padrão</div>
                            <div className="x-stat-val" style={{ fontSize: 14, fontWeight: 600 }}>
                                {data.diasHorariosPadrao || "—"}
                            </div>
                        </div>
                        <div className="x-stat x-reveal">
                            <div className="x-stat-lbl">Criada em</div>
                            <div className="x-stat-val" style={{ fontSize: 14, fontWeight: 600 }}>
                                {criadoEm ?? "—"}
                            </div>
                        </div>
                    </div>

                    {/* Members */}
                    <div className="x-card pad-lg">
                        <div className="x-card-title">
                            Membros
                            <span className="x-pill">{totalMembros}</span>
                        </div>
                        <p className="x-card-sub">Ações só aparecem para administradores.</p>
                        <hr className="x-divider" />

                        <div className="x-list">
                            {membrosPaginados.map((m) => {
                                const isMe = euId === m.usuarioId;
                                const canManage = souAdmin && !isMe;
                                const isAdm = isAdminRole(m.papel);

                                return (
                                    <div key={m.usuarioId} className={`x-row ${m.ativo ? "" : "dim"}`}>
                                        <div className="x-avatar sm">
                                            {String(m.nome || "?").trim().charAt(0).toUpperCase()}
                                        </div>
                                        <div className="x-row-main">
                                            <div className="x-row-name">
                                                {m.nome}
                                                {isMe && <span className="x-row-me">você</span>}
                                            </div>
                                            <div className="x-row-meta">
                                                <span className={`x-pill ${isAdm ? "accent" : ""}`}>{isAdm ? "Admin" : "Membro"}</span>
                                                <span className={`x-pill ${m.ativo ? "success" : ""}`}>{m.ativo ? "Ativo" : "Inativo"}</span>
                                            </div>
                                        </div>
                                        <div className="x-row-actions">
                                            {canManage ? (
                                                <>
                                                    {isAdm ? (
                                                        <button
                                                            className="x-btn ghost sm"
                                                            disabled={busyUserId === m.usuarioId}
                                                            onClick={() => setConfirm({ kind: "REBAIXAR", usuarioId: m.usuarioId, nome: m.nome, papel: m.papel })}
                                                        >Rebaixar</button>
                                                    ) : (
                                                        <button
                                                            className="x-btn sm"
                                                            disabled={busyUserId === m.usuarioId}
                                                            onClick={() => setConfirm({ kind: "PROMOVER", usuarioId: m.usuarioId, nome: m.nome, papel: m.papel })}
                                                        >Promover</button>
                                                    )}
                                                    <button
                                                        className="x-btn danger sm"
                                                        disabled={busyUserId === m.usuarioId}
                                                        onClick={() => setConfirm({ kind: "REMOVER", usuarioId: m.usuarioId, nome: m.nome, papel: m.papel })}
                                                    >Remover</button>
                                                </>
                                            ) : (
                                                <span className="x-meta">—</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalMembros > PAGE_SIZE && (
                            <div className="x-pager">
                                <div className="x-pager-info">
                                    Mostrando <b>{pageStart + 1}</b>–<b>{pageEnd}</b> de <b>{totalMembros}</b>
                                </div>
                                <div className="x-pager-btns">
                                    <button className="x-btn ghost sm" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                                    <button className="x-btn ghost sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</button>
                                    <span className="x-meta" style={{ padding: "0 8px" }}>{page} / {totalPages}</span>
                                    <button className="x-btn ghost sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
                                    <button className="x-btn ghost sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal de senha */}
            {showSenhaModal && (
                <div className="x-modal-overlay" onClick={() => setShowSenhaModal(false)}>
                    <div className="x-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="x-eyebrow">Equipe fechada</div>
                        <h3 className="x-modal-title" style={{ marginTop: 12 }}>
                            Digite a senha
                        </h3>
                        <p className="x-modal-text">
                            Para entrar em <b>{data.nome}</b>, informe a senha da equipe.
                        </p>
                        <input
                            className="x-input"
                            type="password"
                            placeholder="Senha"
                            value={senhaInput}
                            onChange={(e) => setSenhaInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleEntrarComSenha()}
                            autoFocus
                            style={{ marginBottom: 20 }}
                        />
                        <div className="x-modal-actions">
                            <button className="x-btn ghost" onClick={() => { setShowSenhaModal(false); setSenhaInput(""); }}>Cancelar</button>
                            <button className="x-btn" onClick={handleEntrarComSenha} disabled={!senhaInput.trim() || loadingEntrar}>
                                {loadingEntrar ? "..." : "Entrar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmação */}
            {confirm && (
                <div className="x-modal-overlay" onClick={() => setConfirm(null)}>
                    <div className="x-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="x-eyebrow">Confirmar ação</div>
                        <h3 className="x-modal-title" style={{ marginTop: 12 }}>
                            {confirm.kind === "PROMOVER" && "Promover membro"}
                            {confirm.kind === "REBAIXAR" && "Rebaixar admin"}
                            {confirm.kind === "REMOVER" && "Remover membro"}
                        </h3>
                        <p className="x-modal-text">
                            {confirm.kind === "PROMOVER" && <>Promover <b>{confirm.nome}</b> para administrador?</>}
                            {confirm.kind === "REBAIXAR" && <>Rebaixar <b>{confirm.nome}</b> para membro?</>}
                            {confirm.kind === "REMOVER" && <>Remover <b>{confirm.nome}</b> da equipe?</>}
                        </p>
                        {confirm.kind === "REBAIXAR" && adminsAtivos <= 1 && (
                            <div className="x-alert err" style={{ marginBottom: 20 }}>
                                <div><span className="x-alert-text">Você não pode rebaixar o último administrador.</span></div>
                            </div>
                        )}
                        <div className="x-modal-actions">
                            <button className="x-btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
                            <button
                                className={`x-btn ${confirm.kind === "REMOVER" ? "danger" : ""}`}
                                onClick={handleConfirmAction}
                                disabled={busyUserId === confirm.usuarioId || (confirm.kind === "REBAIXAR" && adminsAtivos <= 1)}
                            >Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
