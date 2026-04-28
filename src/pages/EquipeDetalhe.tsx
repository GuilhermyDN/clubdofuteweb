import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEquipe, entrarEquipeAberta, entrarEquipeFechada, trocarSenhaEquipe, atualizarEquipe, deletarEquipe } from "../services/equipe";
import { listarPartidasEquipe } from "../services/equipePartidas";
import type { Esporte, StatusEquipe } from "../services/equipe";
import { getEu } from "../services/eu";
import { promoverAdmin, rebaixarMembro, removerMembro } from "../services/membrosEquipe";
import type { EquipeDetalhe } from "../services/equipe";
import { getEstatisticasUsuario } from "../services/estatisticas";
import type { Estatisticas } from "../services/estatisticas";
import AppHeader from "../components/AppHeader";
import CountUp from "../components/CountUp";
import { toast } from "../components/Toast";
import { explainError, isAuthError, isNotImplemented } from "../utils/errors";

function fmtISOToBR(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("pt-BR");
}
const DIA_ABREV: Record<string, string> = {
    segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui",
    sexta: "Sex", sabado: "Sáb", domingo: "Dom",
};
function fmtDiasHorarios(s?: string | null) {
    if (!s) return null;
    const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    return parts.map((p) => {
        const [dia, hora] = p.split("-");
        return `${DIA_ABREV[dia?.toLowerCase()] ?? dia} ${hora ?? ""}`.trim();
    }).join(", ");
}
function fmtCEP(s?: string | null) {
    if (!s) return "";
    const digits = s.replace(/\D/g, "");
    if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return s;
}
type DiaKey = "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo";
const DIAS_AGENDA: { key: DiaKey; label: string }[] = [
    { key: "segunda", label: "segunda" },
    { key: "terca", label: "terça" },
    { key: "quarta", label: "quarta" },
    { key: "quinta", label: "quinta" },
    { key: "sexta", label: "sexta" },
    { key: "sabado", label: "sábado" },
    { key: "domingo", label: "domingo" },
];
type AgendaState = Record<DiaKey, { enabled: boolean; time: string }>;
const AGENDA_VAZIA: AgendaState = {
    segunda: { enabled: false, time: "19:00" },
    terca: { enabled: false, time: "19:00" },
    quarta: { enabled: false, time: "19:00" },
    quinta: { enabled: false, time: "19:00" },
    sexta: { enabled: false, time: "19:00" },
    sabado: { enabled: false, time: "09:00" },
    domingo: { enabled: false, time: "09:00" },
};
function parseAgenda(s?: string | null): AgendaState {
    const next: AgendaState = JSON.parse(JSON.stringify(AGENDA_VAZIA));
    if (!s) return next;
    s.split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => {
        const [diaRaw, horaRaw] = p.split("-");
        const dia = (diaRaw ?? "").toLowerCase() as DiaKey;
        if (!(dia in next)) return;
        next[dia].enabled = true;
        if (horaRaw && /^\d{1,2}:\d{2}$/.test(horaRaw.trim())) {
            next[dia].time = horaRaw.trim();
        }
    });
    return next;
}
function agendaToStr(a: AgendaState): string {
    return DIAS_AGENDA
        .filter((d) => a[d.key].enabled)
        .map((d) => `${d.key}-${a[d.key].time}`)
        .join(",");
}

function LockIcon({ open, size = 22 }: { open: boolean; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            {open
                ? <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                : <path d="M7 11V7a5 5 0 0 1 10 0v4" />}
        </svg>
    );
}
function isAdminRole(papel?: string) {
    return papel === "ADMIN" || papel === "ADMINISTRADOR";
}

const MEDAL_COLORS = ["#FFD24A", "#D6D8DE", "#E08A4A"]; // ouro, prata, bronze
const MEDAL_LABELS = ["1º", "2º", "3º"];

function TrophyIcon({ color, size = 18 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 1 1-10 0V4z" fill={color} fillOpacity="0.18" />
            <path d="M17 4h3v2a3 3 0 0 1-3 3" />
            <path d="M7 4H4v2a3 3 0 0 0 3 3" />
        </svg>
    );
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
    const [totalJogos, setTotalJogos] = useState<number | null>(null);

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
    const [editAgenda, setEditAgenda] = useState<AgendaState>(AGENDA_VAZIA);
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
        setEditAgenda(parseAgenda(data.diasHorariosPadrao));
        setShowEditar(true);
    }

    async function handleSalvarEdicao() {
        if (!equipeId) return;
        const agendaStr = agendaToStr(editAgenda);
        const body = {
            nome: editForm.nome.trim(),
            cepOuLocal: editForm.cepOuLocal.trim().replace(/\D/g, "").slice(0, 8) || editForm.cepOuLocal.trim(),
            esporte: editForm.esporte,
            statusEquipe: editForm.statusEquipe,
            diasHorariosPadrao: agendaStr,
        };
        if (!body.nome) { toast.warn("Nome é obrigatório."); return; }
        if (!body.cepOuLocal) { toast.warn("CEP é obrigatório."); return; }
        if (!agendaStr) { toast.warn("Habilite ao menos um dia na agenda."); return; }
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

    // modal "ver mais" do membro (detalhes + estatísticas)
    const [detalheMembro, setDetalheMembro] = useState<{ usuarioId: number; nome: string; papel?: string; ativo?: boolean } | null>(null);
    const [detalheStats, setDetalheStats] = useState<Estatisticas | null>(null);
    const [detalheLoading, setDetalheLoading] = useState(false);
    const [detalheErr, setDetalheErr] = useState<string | null>(null);

    async function abrirDetalheMembro(m: { usuarioId: number; nome: string; papel?: string; ativo?: boolean }) {
        setDetalheMembro(m);
        setDetalheStats(null);
        setDetalheErr(null);
        setDetalheLoading(true);
        try {
            const s = await getEstatisticasUsuario(m.usuarioId);
            setDetalheStats(s);
        } catch (e: any) {
            if (isAuthError(e)) return;
            if (isNotImplemented(e)) {
                setDetalheErr("Estatísticas deste jogador ainda não estão disponíveis.");
            } else {
                setDetalheErr(explainError(e));
            }
        } finally {
            setDetalheLoading(false);
        }
    }

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

            // Número de jogos/partidas da equipe (silencioso se falhar)
            listarPartidasEquipe(equipeId)
                .then((ps) => setTotalJogos(ps.length))
                .catch(() => setTotalJogos(null));

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

    const membros = useMemo(() => {
        const arr = [...(data?.membros ?? [])];
        // ordena por nota desc (nulos no fim), empate por nome
        arr.sort((a, b) => {
            const na = typeof a.nota === "number" ? a.nota : -Infinity;
            const nb = typeof b.nota === "number" ? b.nota : -Infinity;
            if (nb !== na) return nb - na;
            return (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
        });
        return arr;
    }, [data]);
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
                            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                                <h1 className="x-phero-title" style={{ margin: 0 }}>{data.nome}</h1>
                                {typeof data.notaEquipe === "number" && (
                                    <span style={{
                                        color: "var(--x-accent)",
                                        fontWeight: 800,
                                        fontSize: "1.6rem",
                                        lineHeight: 1,
                                        whiteSpace: "nowrap",
                                    }}>
                                        ★ {Number(data.notaEquipe).toFixed(1)}
                                    </span>
                                )}
                                <span
                                    style={{
                                        display: "inline-flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 2,
                                        color: data.statusEquipe === "ABERTA" ? "var(--x-accent)" : "#ff8a8a",
                                    }}
                                    title={data.statusEquipe === "ABERTA" ? "Equipe aberta" : "Equipe fechada"}
                                >
                                    <LockIcon open={data.statusEquipe === "ABERTA"} />
                                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
                                        {data.statusEquipe === "ABERTA" ? "Aberta" : "Fechada"}
                                    </span>
                                </span>
                            </div>

                            <div className="x-phero-info" style={{ marginTop: 14, display: "grid", gap: 6, color: "var(--x-meta, #aab)" }}>
                                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                                    <span><strong style={{ color: "#fff", marginRight: 6 }}>CEP</strong>{fmtCEP(data.cepOuLocal) || "—"}</span>
                                </div>
                                <div><strong style={{ color: "#fff", marginRight: 6 }}>Esporte</strong>{data.esporte}</div>
                                <div><strong style={{ color: "#fff", marginRight: 6 }}>Criada em</strong>{criadoEm ?? "—"}</div>
                                <div><strong style={{ color: "#fff", marginRight: 6 }}>Dias de jogo</strong>{fmtDiasHorarios(data.diasHorariosPadrao) ?? "—"}</div>
                                <div><strong style={{ color: "#fff", marginRight: 6 }}>Jogos</strong>{totalJogos == null ? "—" : totalJogos}</div>
                            </div>

                            <div className="x-phero-meta" style={{ marginTop: 14 }}>
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
                        <div className="x-stat-mini">
                            <span className="x-stat-mini-lbl">Jogos</span>
                            <span className="x-stat-mini-val">
                                {totalJogos == null ? "—" : <CountUp to={totalJogos} />}
                            </span>
                        </div>
                    </div>

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
                                ? "Toque em “Ver mais” para ver estatísticas do jogador, promover, rebaixar ou remover."
                                : souMembro
                                    ? "Toque em “Ver mais” para ver estatísticas de cada jogador."
                                    : "Toque em “Ver mais” para ver estatísticas de cada jogador."}
                        </p>
                        <hr className="x-divider" />

                        <div className="x-list">
                            {membrosPaginados.map((m, idx) => {
                                const absoluteRank = pageStart + idx; // 0-based
                                const isMe = euId === m.usuarioId;
                                const isAdm = isAdminRole(m.papel);
                                const hasNota = typeof m.nota === "number";
                                const medal = absoluteRank < 3 && hasNota ? absoluteRank : -1;
                                const medalColor = medal >= 0 ? MEDAL_COLORS[medal] : null;
                                const medalLabel = medal >= 0 ? MEDAL_LABELS[medal] : null;

                                return (
                                    <div
                                        key={m.usuarioId}
                                        className={`x-row ${m.ativo ? "" : "dim"}`}
                                        style={medal >= 0 ? { borderLeft: `3px solid ${medalColor}` } : undefined}
                                    >
                                        <div className="x-avatar sm" style={medal >= 0 ? { boxShadow: `0 0 0 2px ${medalColor}` } : undefined}>
                                            {String(m.nome || "?").trim().charAt(0).toUpperCase()}
                                        </div>
                                        <div className="x-row-main">
                                            <div className="x-row-name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                {medal >= 0 && (
                                                    <span
                                                        title={`${medalLabel} lugar`}
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 4,
                                                            color: medalColor ?? undefined,
                                                            fontWeight: 800,
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        <TrophyIcon color={medalColor ?? "#FFD24A"} size={16} />
                                                        {medalLabel}
                                                    </span>
                                                )}
                                                {m.nome}
                                                {isMe && <span className="x-row-me">você</span>}
                                            </div>
                                            <div className="x-row-meta">
                                                <span className={`x-pill ${isAdm ? "accent" : ""}`}>{isAdm ? "Admin" : "Membro"}</span>
                                                <span className={`x-pill ${m.ativo ? "success" : ""}`}>{m.ativo ? "Ativo" : "Inativo"}</span>
                                                {hasNota && (
                                                    <span className="x-pill" title="Nota do jogador">
                                                        ★ {Number(m.nota).toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="x-row-actions">
                                            <button
                                                className="x-btn ghost sm"
                                                onClick={() => abrirDetalheMembro({
                                                    usuarioId: m.usuarioId,
                                                    nome: m.nome,
                                                    papel: m.papel,
                                                    ativo: m.ativo,
                                                })}
                                                title="Ver detalhes e estatísticas"
                                            >
                                                Ver mais
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </button>
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
                                <label>CEP</label>
                                <input
                                    className="x-input"
                                    placeholder="00000-000"
                                    inputMode="numeric"
                                    autoComplete="postal-code"
                                    value={(() => {
                                        const v = editForm.cepOuLocal ?? "";
                                        const nums = v.replace(/\D/g, "");
                                        if (/^\d+-?\d*$/.test(v) || nums.length > 0 && nums === v.replace(/-/g, "")) {
                                            const n = nums.slice(0, 8);
                                            return n.length <= 5 ? n : `${n.slice(0, 5)}-${n.slice(5)}`;
                                        }
                                        return v;
                                    })()}
                                    onChange={(e) => setEditForm((p) => ({ ...p, cepOuLocal: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
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
                            <div>
                                <label className="x-label" style={{ display: "block", marginBottom: 10 }}>
                                    Agenda padrão
                                </label>
                                <div className="x-agenda">
                                    {DIAS_AGENDA.map((d) => {
                                        const item = editAgenda[d.key];
                                        return (
                                            <div key={d.key} className={`x-agenda-row ${item.enabled ? "on" : ""}`}>
                                                <label className="x-agenda-day">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.enabled}
                                                        onChange={(e) => {
                                                            const enabled = e.target.checked;
                                                            setEditAgenda((prev) => ({ ...prev, [d.key]: { ...prev[d.key], enabled } }));
                                                        }}
                                                    />
                                                    <span>{d.label}</span>
                                                </label>
                                                <input
                                                    type="time"
                                                    className="x-agenda-time"
                                                    value={item.time}
                                                    disabled={!item.enabled}
                                                    onChange={(e) => {
                                                        const time = e.target.value;
                                                        setEditAgenda((prev) => ({ ...prev, [d.key]: { ...prev[d.key], time } }));
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
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

            {/* Modal de detalhes do membro */}
            {detalheMembro && (
                <div className="x-modal-overlay" onClick={() => setDetalheMembro(null)}>
                    <div className="x-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="x-eyebrow">Jogador</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, marginBottom: 8 }}>
                            <div className="x-avatar">
                                {String(detalheMembro.nome || "?").trim().charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 className="x-modal-title" style={{ margin: 0 }}>{detalheMembro.nome}</h3>
                                <div className="x-row-meta" style={{ marginTop: 6 }}>
                                    <span className={`x-pill ${isAdminRole(detalheMembro.papel) ? "accent" : ""}`}>
                                        {isAdminRole(detalheMembro.papel) ? "Admin" : "Membro"}
                                    </span>
                                    <span className={`x-pill ${detalheMembro.ativo ? "success" : ""}`}>
                                        {detalheMembro.ativo ? "Ativo" : "Inativo"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <hr className="x-divider" />

                        {/* Estatísticas */}
                        <div style={{ marginBottom: 20 }}>
                            <div className="x-eyebrow" style={{ marginBottom: 10 }}>Estatísticas</div>
                            {detalheLoading ? (
                                <div className="x-loading" style={{ padding: 20 }}>
                                    <div className="x-spinner" /> Carregando...
                                </div>
                            ) : detalheErr ? (
                                <p className="x-meta">{detalheErr}</p>
                            ) : detalheStats ? (
                                <>
                                    <div className="x-stats-compact" style={{ marginBottom: 18 }}>
                                        <div className="x-stat-mini">
                                            <span className="x-stat-mini-lbl">Nota atual</span>
                                            <span className="x-stat-mini-val" style={{ color: "var(--x-accent)" }}>
                                                {detalheStats.notaAtual != null ? `★ ${Number(detalheStats.notaAtual).toFixed(1)}` : "—"}
                                            </span>
                                        </div>
                                        <div className="x-stat-mini">
                                            <span className="x-stat-mini-lbl">Partidas</span>
                                            <span className="x-stat-mini-val">{detalheStats.totalPartidas ?? 0}</span>
                                        </div>
                                        <div className="x-stat-mini">
                                            <span className="x-stat-mini-lbl">Média recebida</span>
                                            <span className="x-stat-mini-val">
                                                {detalheStats.mediaNotasRecebidas != null ? Number(detalheStats.mediaNotasRecebidas).toFixed(1) : "—"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Últimas partidas */}
                                    {detalheStats.ultimasPartidas?.length > 0 && (
                                        <>
                                            <div className="x-eyebrow" style={{ marginBottom: 8 }}>Últimas partidas</div>
                                            <div className="x-list" style={{ marginBottom: 18 }}>
                                                {detalheStats.ultimasPartidas.map((p) => (
                                                    <div key={p.partidaId} className="x-row">
                                                        <div className="x-row-main">
                                                            <div className="x-row-name">
                                                                {new Date(p.dataHora).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                                                                {p.foiMvp && (
                                                                    <span className="x-row-me" style={{ background: "rgba(255,210,74,0.16)", color: "#FFD24A", borderColor: "rgba(255,210,74,0.35)" }}>
                                                                        🏆 MVP
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="x-row-meta">
                                                                <span className="x-pill">
                                                                    {p.notaRecebida != null ? `★ ${Number(p.notaRecebida).toFixed(1)}` : "sem nota"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* Parceiros frequentes */}
                                    {detalheStats.parceirosFrequentes?.length > 0 && (
                                        <>
                                            <div className="x-eyebrow" style={{ marginBottom: 8 }}>Parceiros frequentes</div>
                                            <div className="x-list">
                                                {detalheStats.parceirosFrequentes.slice(0, 3).map((pp) => (
                                                    <div key={pp.usuarioId} className="x-row">
                                                        <div className="x-avatar sm">
                                                            {String(pp.nome || "?").trim().charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="x-row-main">
                                                            <div className="x-row-name">{pp.nome}</div>
                                                            <div className="x-row-meta">
                                                                <span className="x-pill">
                                                                    {pp.totalPartidasJuntos} partida{pp.totalPartidasJuntos !== 1 ? "s" : ""}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <p className="x-meta">Sem dados.</p>
                            )}
                        </div>

                        {/* Ações de admin */}
                        {souAdmin && euId !== detalheMembro.usuarioId && (
                            <>
                                <hr className="x-divider" />
                                <div className="x-eyebrow" style={{ marginBottom: 10 }}>Ações de admin</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                                    {isAdminRole(detalheMembro.papel) ? (
                                        <button
                                            className="x-btn ghost sm"
                                            disabled={busyUserId === detalheMembro.usuarioId}
                                            onClick={() => {
                                                const m = detalheMembro;
                                                setDetalheMembro(null);
                                                setConfirm({ kind: "REBAIXAR", usuarioId: m.usuarioId, nome: m.nome, papel: m.papel });
                                            }}
                                        >Rebaixar admin</button>
                                    ) : (
                                        <button
                                            className="x-btn sm"
                                            disabled={busyUserId === detalheMembro.usuarioId}
                                            onClick={() => {
                                                const m = detalheMembro;
                                                setDetalheMembro(null);
                                                setConfirm({ kind: "PROMOVER", usuarioId: m.usuarioId, nome: m.nome, papel: m.papel });
                                            }}
                                        >Promover a admin</button>
                                    )}
                                    <button
                                        className="x-btn danger sm"
                                        disabled={busyUserId === detalheMembro.usuarioId}
                                        onClick={() => {
                                            const m = detalheMembro;
                                            setDetalheMembro(null);
                                            setConfirm({ kind: "REMOVER", usuarioId: m.usuarioId, nome: m.nome, papel: m.papel });
                                        }}
                                    >Remover da equipe</button>
                                </div>
                            </>
                        )}

                        <div className="x-modal-actions">
                            <button className="x-btn ghost" onClick={() => setDetalheMembro(null)}>Fechar</button>
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
