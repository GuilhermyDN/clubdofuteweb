import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEquipe, entrarEquipeAberta, entrarEquipeFechada, trocarSenhaEquipe, atualizarEquipe, deletarEquipe } from "../services/equipe";
import type { Esporte, StatusEquipe } from "../services/equipe";
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

    // modal "trocar senha" (admin, só em equipes FECHADAS)
    const [showTrocarSenha, setShowTrocarSenha] = useState(false);
    const [novaSenha, setNovaSenha] = useState("");
    const [trocandoSenha, setTrocandoSenha] = useState(false);

    // modal editar equipe (admin)
    const [showEditar, setShowEditar] = useState(false);
    const [editForm, setEditForm] = useState({
        nome: "", cepOuLocal: "", esporte: "VOLEI" as Esporte,
        statusEquipe: "ABERTA" as StatusEquipe, diasHorariosPadrao: "",
    });
    const [salvandoEdit, setSalvandoEdit] = useState(false);

    // confirmação de excluir equipe
    const [showDeletar, setShowDeletar] = useState(false);
    const [deletando, setDeletando] = useState(false);

    function abrirEditar() {
        if (!data) return;
        setEditForm({
            nome: data.nome,
            cepOuLocal: data.cepOuLocal,
            esporte: data.esporte,
            statusEquipe: data.statusEquipe,
            diasHorariosPadrao: data.diasHorariosPadrao ?? "",
        });
        setShowEditar(true);
    }

    async function handleSalvarEdicao() {
        if (!equipeId) return;
        const body = {
            nome: editForm.nome.trim(),
            cepOuLocal: editForm.cepOuLocal.trim(),
            esporte: editForm.esporte,
            statusEquipe: editForm.statusEquipe,
            diasHorariosPadrao: editForm.diasHorariosPadrao.trim(),
        };
        if (!body.nome) { toast.warn("Nome é obrigatório."); return; }
        if (!body.cepOuLocal) { toast.warn("Local é obrigatório."); return; }
        try {
            setSalvandoEdit(true);
            await atualizarEquipe(equipeId, body);
            toast.success("Equipe atualizada.");
            setShowEditar(false);
            await load();
        } catch (e: any) {
            if (!isAuthError(e)) toast.error(explainError(e), "Falha ao salvar");
        } finally { setSalvandoEdit(false); }
    }

    async function handleDeletar() {
        if (!equipeId) return;
        try {
            setDeletando(true);
            await deletarEquipe(equipeId);
            toast.success("Equipe deletada.");
            nav("/equipes");
        } catch (e: any) {
            if (!isAuthError(e)) toast.error(explainError(e), "Falha ao deletar");
        } finally { setDeletando(false); setShowDeletar(false); }
    }

    async function handleTrocarSenha() {
        if (!equipeId) return;
        if (!novaSenha.trim() || novaSenha.trim().length < 4) {
            toast.warn("Nova senha precisa de pelo menos 4 caracteres.");
            return;
        }
        try {
            setTrocandoSenha(true);
            await trocarSenhaEquipe(equipeId, novaSenha.trim());
            toast.success("Senha da equipe atualizada.");
            setShowTrocarSenha(false);
            setNovaSenha("");
        } catch (e: any) {
            if (!isAuthError(e)) toast.error(explainError(e), "Falha ao trocar senha");
        } finally {
            setTrocandoSenha(false);
        }
    }

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

            // Admin detection com múltiplas fontes (robusta contra backends variantes)
            const anyEquipe: any = equipe;
            const membros: any[] = anyEquipe.membros ?? [];
            const meu = membros.find((m) => m.usuarioId === eu.id);

            // Prioridade 1: campos meuPapel / souMembro do backend
            const papelExplicito = anyEquipe.meuPapel;
            if (papelExplicito) {
                setSouAdmin(String(papelExplicito).toUpperCase().startsWith("ADMIN"));
                setSouMembro(anyEquipe.souMembro !== false);
            } else {
                // Fallback: procura na lista de membros
                setSouAdmin(isAdminRole(meu?.papel));
                setSouMembro(meu !== undefined && meu.ativo !== false);
            }
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
        const eqId = Number(data.id);
        setBusyUserId(usuarioId);
        try { await promoverAdmin(eqId, usuarioId); toast.success("Usuário promovido a administrador."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao promover"); }
        finally { setBusyUserId(null); }
    }
    async function doRebaixar(usuarioId: number) {
        if (!data) return;
        if (adminsAtivos <= 1) { toast.warn("Não é possível rebaixar o último administrador."); return; }
        const eqId = Number(data.id);
        setBusyUserId(usuarioId);
        try { await rebaixarMembro(eqId, usuarioId); toast.success("Administrador rebaixado."); await load(); }
        catch (e: any) { if (!isAuthError(e)) toast.error(explainError(e), "Falha ao rebaixar"); }
        finally { setBusyUserId(null); }
    }
    async function doRemover(usuarioId: number) {
        if (!data) return;
        const eqId = Number(data.id);
        setBusyUserId(usuarioId);
        try { await removerMembro(eqId, usuarioId); toast.success("Membro removido."); await load(); }
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

    async function handleCompartilhar() {
        if (!data) return;
        const url = `${window.location.origin}/equipes/${data.id}`;
        const title = `Equipe ${data.nome} · ClubeDoFut`;
        const text = data.statusEquipe === "FECHADA"
            ? `Entra na equipe "${data.nome}" no ClubeDoFut. Peça a senha ao admin.`
            : `Entra na equipe "${data.nome}" no ClubeDoFut.`;

        // tenta Web Share API (mobile + alguns browsers desktop)
        const nav: any = window.navigator;
        if (nav.share) {
            try {
                await nav.share({ title, text, url });
                return;
            } catch {
                // usuário cancelou ou navegador falhou — cai pro fallback
            }
        }
        // fallback: copia link pra área de transferência
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copiado pra área de transferência!");
        } catch {
            // último fallback: abre WhatsApp Web com o texto
            window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
        }
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
                            <button
                                className="x-btn ghost sm"
                                onClick={handleCompartilhar}
                                title="Compartilhar equipe"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="18" cy="5" r="3" />
                                    <circle cx="6" cy="12" r="3" />
                                    <circle cx="18" cy="19" r="3" />
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                </svg>
                                Compartilhar
                            </button>
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
                    {/* Stats compactas */}
                    <div className="x-stats-compact x-reveal" style={{ marginBottom: 24 }}>
                        <div className="x-stat-mini">
                            <span className="x-stat-mini-lbl">Membros</span>
                            <span className="x-stat-mini-val"><CountUp to={totalMembros} /></span>
                        </div>
                        <div className="x-stat-mini">
                            <span className="x-stat-mini-lbl">Ativos</span>
                            <span className="x-stat-mini-val"><CountUp to={membrosAtivos} /></span>
                        </div>
                        <div className="x-stat-mini">
                            <span className="x-stat-mini-lbl">Admins</span>
                            <span className="x-stat-mini-val"><CountUp to={adminsAtivos} /></span>
                        </div>
                    </div>

                    {/* Meta row */}
                    {(data.diasHorariosPadrao || criadoEm) && (
                        <div className="x-meta-row x-reveal" style={{ marginBottom: 28 }}>
                            {data.diasHorariosPadrao && (
                                <div className="x-meta-item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    <span>{data.diasHorariosPadrao}</span>
                                </div>
                            )}
                            {criadoEm && (
                                <div className="x-meta-item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <span>Criada em {criadoEm}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Administração (só admin) */}
                    {souAdmin && (
                        <div className="x-card" style={{ marginBottom: 20 }}>
                            <div className="x-card-title">
                                Administração
                                <span className="x-pill accent">Admin</span>
                            </div>
                            <p className="x-card-sub">Gerencie configurações da equipe.</p>
                            <hr className="x-divider" />

                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div className="x-logout-card" style={{ marginTop: 0, borderLeftColor: "var(--x-accent)" }}>
                                    <div>
                                        <div className="x-logout-title">Editar dados da equipe</div>
                                        <div className="x-logout-sub">
                                            Atualize nome, local, esporte ou agenda padrão.
                                        </div>
                                    </div>
                                    <button className="x-btn" onClick={abrirEditar}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        Editar
                                    </button>
                                </div>

                                {data.statusEquipe === "FECHADA" && (
                                    <div className="x-logout-card" style={{ marginTop: 0, borderLeftColor: "var(--x-accent)" }}>
                                        <div>
                                            <div className="x-logout-title">Trocar senha da equipe</div>
                                            <div className="x-logout-sub">
                                                Membros atuais continuam entrando. Só novos convidados precisarão da nova senha.
                                            </div>
                                        </div>
                                        <button className="x-btn" onClick={() => setShowTrocarSenha(true)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                            </svg>
                                            Trocar senha
                                        </button>
                                    </div>
                                )}

                                <div className="x-logout-card" style={{ marginTop: 0 }}>
                                    <div>
                                        <div className="x-logout-title" style={{ color: "var(--x-danger)" }}>Deletar equipe</div>
                                        <div className="x-logout-sub">
                                            Ação permanente. Todos os membros serão removidos e o histórico de partidas apagado.
                                        </div>
                                    </div>
                                    <button className="x-btn danger" onClick={() => setShowDeletar(true)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                        Deletar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Members */}
                    <div className="x-card pad-lg">
                        <div className="x-card-title">
                            Membros
                            <span className="x-pill">{totalMembros}</span>
                        </div>
                        <p className="x-card-sub">
                            {souAdmin
                                ? "Como admin, você pode promover, rebaixar ou remover membros."
                                : souMembro
                                    ? "Você é membro desta equipe."
                                    : "Apenas membros visualizam ações."}
                        </p>
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

            {/* Modal editar equipe */}
            {showEditar && (
                <div className="x-modal-overlay" onClick={() => { if (!salvandoEdit) setShowEditar(false); }}>
                    <div className="x-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="x-eyebrow">Administração</div>
                        <h3 className="x-modal-title" style={{ marginTop: 12 }}>Editar equipe</h3>
                        <p className="x-modal-text">Atualize as informações visíveis pros membros e convidados.</p>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                            <div className="x-field">
                                <label>Nome</label>
                                <input
                                    className="x-input"
                                    value={editForm.nome}
                                    onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
                                />
                            </div>
                            <div className="x-field">
                                <label>Local</label>
                                <input
                                    className="x-input"
                                    value={editForm.cepOuLocal}
                                    onChange={(e) => setEditForm((p) => ({ ...p, cepOuLocal: e.target.value }))}
                                />
                            </div>
                            <div className="x-form-grid">
                                <div className="x-field">
                                    <label>Esporte</label>
                                    <select
                                        className="x-select"
                                        value={editForm.esporte}
                                        onChange={(e) => setEditForm((p) => ({ ...p, esporte: e.target.value as Esporte }))}
                                    >
                                        <option value="VOLEI">Vôlei</option>
                                        <option value="FUTEVOLEI">Futevôlei</option>
                                    </select>
                                </div>
                                <div className="x-field">
                                    <label>Status</label>
                                    <select
                                        className="x-select"
                                        value={editForm.statusEquipe}
                                        onChange={(e) => setEditForm((p) => ({ ...p, statusEquipe: e.target.value as StatusEquipe }))}
                                    >
                                        <option value="ABERTA">Aberta</option>
                                        <option value="FECHADA">Fechada</option>
                                    </select>
                                </div>
                            </div>
                            <div className="x-field">
                                <label>Agenda padrão</label>
                                <input
                                    className="x-input"
                                    placeholder="ex: sabado-09:00,quarta-19:00"
                                    value={editForm.diasHorariosPadrao}
                                    onChange={(e) => setEditForm((p) => ({ ...p, diasHorariosPadrao: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="x-modal-actions">
                            <button className="x-btn ghost" onClick={() => setShowEditar(false)} disabled={salvandoEdit}>Cancelar</button>
                            <button className="x-btn" onClick={handleSalvarEdicao} disabled={salvandoEdit}>
                                {salvandoEdit ? "Salvando..." : "Salvar alterações"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmar deletar */}
            {showDeletar && (
                <div className="x-modal-overlay" onClick={() => { if (!deletando) setShowDeletar(false); }}>
                    <div className="x-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="x-eyebrow" style={{ color: "var(--x-danger)" }}>Ação permanente</div>
                        <h3 className="x-modal-title" style={{ marginTop: 12 }}>Deletar equipe?</h3>
                        <p className="x-modal-text">
                            A equipe <b>{data.nome}</b> será apagada permanentemente, junto com todos os membros e partidas. Essa ação <b>não pode ser desfeita</b>.
                        </p>
                        <div className="x-modal-actions">
                            <button className="x-btn ghost" onClick={() => setShowDeletar(false)} disabled={deletando}>Cancelar</button>
                            <button className="x-btn danger" onClick={handleDeletar} disabled={deletando}>
                                {deletando ? "Deletando..." : "Sim, deletar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal trocar senha da equipe */}
            {showTrocarSenha && (
                <div className="x-modal-overlay" onClick={() => { if (!trocandoSenha) setShowTrocarSenha(false); }}>
                    <div className="x-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="x-eyebrow">Administração</div>
                        <h3 className="x-modal-title" style={{ marginTop: 12 }}>
                            Trocar senha
                        </h3>
                        <p className="x-modal-text">
                            Defina uma nova senha pra equipe <b>{data.nome}</b>. Membros já admitidos
                            não são afetados — só quem entrar depois precisará da nova senha.
                        </p>
                        <div className="x-field" style={{ marginBottom: 20 }}>
                            <label>Nova senha</label>
                            <input
                                className="x-input x-masked"
                                type="text"
                                name="team-passcode"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                data-lpignore="true"
                                data-1p-ignore="true"
                                data-bwignore="true"
                                data-form-type="other"
                                placeholder="Mínimo 4 caracteres"
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleTrocarSenha()}
                                autoFocus
                            />
                        </div>
                        <div className="x-modal-actions">
                            <button className="x-btn ghost" onClick={() => { setShowTrocarSenha(false); setNovaSenha(""); }} disabled={trocandoSenha}>
                                Cancelar
                            </button>
                            <button className="x-btn" onClick={handleTrocarSenha} disabled={trocandoSenha || !novaSenha.trim()}>
                                {trocandoSenha ? "Salvando..." : "Salvar nova senha"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            className="x-input x-masked"
                            type="text"
                            name="team-passcode"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-bwignore="true"
                            data-form-type="other"
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
