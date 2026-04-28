import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEquipe } from "../services/equipe";
import {
    criarPartidaEquipe, listarPartidasEquipe,
    type CriarPartidaBody, type PartidaResumo, type PoliticaInscricao,
} from "../services/equipePartidas";
import { api } from "../services/api";
import AppHeader from "../components/AppHeader";
import { toast } from "../components/Toast";
import { explainError, isAuthError } from "../utils/errors";

type EuResponse = { id: number; nome?: string; };

function fmtDateBox(iso: string): { dia: string; mes: string; hora: string; weekday: string } {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { dia: "—", mes: "—", hora: "—", weekday: "—" };
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").slice(0, 3).toUpperCase();
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
    return { dia, mes, hora, weekday };
}
function toLocalInputValue(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toIsoFromDatetimeLocal(v: string) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

export default function EquipePartidasPage() {
    const { equipeId } = useParams();
    const nav = useNavigate();

    const [loading, setLoading] = useState(true);
    const [partidas, setPartidas] = useState<PartidaResumo[]>([]);
    const [souAdmin, setSouAdmin] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<CriarPartidaBody>(() => ({
        dataHora: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        politicaInscricao: "SOMENTE_MEMBROS",
        jogadoresPorTime: 4,
        limiteParticipantes: undefined,
    }));

    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    const dataHoraLocal = useMemo(() => {
        const d = new Date(form.dataHora);
        if (Number.isNaN(d.getTime())) return toLocalInputValue(new Date());
        return toLocalInputValue(d);
    }, [form.dataHora]);

    async function loadAll() {
        if (!equipeId) { setLoading(false); return; }
        setLoading(true);
        try {
            const euRes = await api.get<EuResponse>("/eu");
            const meuId = euRes.data?.id;
            const equipe = await getEquipe(equipeId);
            const isAdmin = !!meuId && (equipe.membros ?? []).some((m) => {
                const papel = String((m as any).papel ?? "").toUpperCase();
                const isAdminRole = papel === "ADMIN" || papel === "ADMINISTRADOR";
                return m.usuarioId === meuId && m.ativo && isAdminRole;
            });
            setSouAdmin(isAdmin);
            const list = await listarPartidasEquipe(equipeId);
            setPartidas(list ?? []);
            setPage((p) => Math.max(1, p));
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha ao carregar partidas");
        } finally { setLoading(false); }
    }

    useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [equipeId]);

    const totalPartidas = partidas.length;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalPartidas / PAGE_SIZE)), [totalPartidas]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
        if (page < 1) setPage(1);
    }, [page, totalPages]);

    const pageStart = (page - 1) * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, totalPartidas);
    const partidasPaginadas = useMemo(() => partidas.slice(pageStart, pageEnd), [partidas, pageStart, pageEnd]);

    async function onCriarPartida() {
        if (!equipeId) return;
        if (!souAdmin) { toast.warn("Você não é administrador desta equipe."); return; }
        const iso = toIsoFromDatetimeLocal(dataHoraLocal);
        if (!iso) { toast.warn("Data/Hora inválida."); return; }

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

        if (!body.politicaInscricao) return toast.warn("Política de inscrição é obrigatória.");
        if (!body.jogadoresPorTime || body.jogadoresPorTime <= 0) return toast.warn("Jogadores por time deve ser maior que 0.");
        if (body.limiteParticipantes !== undefined && body.limiteParticipantes < 0) return toast.warn("Limite não pode ser negativo.");

        try {
            setCreating(true);
            await criarPartidaEquipe(equipeId, body);
            toast.success("Partida criada com sucesso.");
            setShowCreate(false);
            await loadAll();
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha ao criar partida");
        } finally { setCreating(false); }
    }

    if (loading) {
        return (
            <div className="x-app">
                <AppHeader />
                <main className="x-app-main">
                    <div className="x-loading"><div className="x-spinner" /> Carregando partidas...</div>
                </main>
            </div>
        );
    }

    return (
        <div className="x-app">
            <AppHeader />

            <div className="x-phero">
                <div className="x-phero-inner">
                    <button className="x-phero-back" onClick={() => nav(-1)}>← Voltar</button>
                    <div className="x-phero-grid">
                        <div>
                            <h1 className="x-phero-title">Partidas da equipe</h1>
                            <div className="x-meta" style={{ marginBottom: 18 }}>
                                Histórico, criação e métricas da sua equipe
                            </div>
                            <div className="x-phero-meta">
                                {souAdmin ? (
                                    <span className="x-pill accent">Você é admin</span>
                                ) : (
                                    <span className="x-pill">Membro</span>
                                )}
                            </div>
                        </div>
                        <div className="x-phero-actions">
                            <button className="x-btn ghost sm" onClick={() => nav(`/equipes/${equipeId}`)}>Abrir equipe</button>
                            {souAdmin && (
                                <button className="x-btn" onClick={() => setShowCreate(v => !v)}>
                                    {showCreate ? "Fechar" : "Nova partida"} {!showCreate && <span className="x-btn-arr">+</span>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <main className="x-app-main">
                <div className="x-app-container">
                    {/* Criar (só admin) */}
                    {showCreate && souAdmin && (
                        <div className="x-card pad-lg" style={{ marginBottom: 32 }}>
                            <div className="x-card-title">Criar partida</div>
                            <p className="x-card-sub">Defina data, política e tamanho de times.</p>
                            <hr className="x-divider" />

                            <div className="x-form-grid" style={{ marginBottom: 20 }}>
                                <div className="x-field">
                                    <label>Data/Hora</label>
                                    <input
                                        className="x-input"
                                        type="datetime-local"
                                        value={dataHoraLocal}
                                        onChange={(e) => {
                                            const iso2 = toIsoFromDatetimeLocal(e.target.value);
                                            if (!iso2) return;
                                            setForm((p) => ({ ...p, dataHora: iso2 }));
                                        }}
                                    />
                                </div>
                                <div className="x-field">
                                    <label>Política de inscrição</label>
                                    <select
                                        className="x-select"
                                        value={form.politicaInscricao}
                                        onChange={(e) => setForm((p) => ({ ...p, politicaInscricao: e.target.value as any }))}
                                    >
                                        <option value="SOMENTE_MEMBROS">Somente membros</option>
                                        <option value="AVULSOS_ABERTOS">Avulsos abertos</option>
                                    </select>
                                </div>
                                <div className="x-field">
                                    <label>Jogadores por time</label>
                                    <input
                                        className="x-input"
                                        type="number"
                                        min={1}
                                        value={String(form.jogadoresPorTime)}
                                        onChange={(e) => setForm((p) => ({ ...p, jogadoresPorTime: Number(e.target.value) }))}
                                    />
                                </div>
                                <div className="x-field">
                                    <label>Limite de participantes (opcional)</label>
                                    <input
                                        className="x-input"
                                        type="number"
                                        min={0}
                                        value={form.limiteParticipantes === undefined ? "" : String(form.limiteParticipantes)}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setForm((p) => ({ ...p, limiteParticipantes: v === "" ? undefined : Number(v) }));
                                        }}
                                        placeholder="Vazio = sem limite"
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 10 }}>
                                <button className="x-btn" onClick={onCriarPartida} disabled={creating}>
                                    {creating ? "Criando..." : "Criar partida"}
                                </button>
                                <button className="x-btn ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                            </div>
                        </div>
                    )}

                    {!souAdmin && (
                        <div className="x-alert warn" style={{ marginBottom: 24 }}>
                            <div>
                                <span className="x-alert-title">Somente leitura</span>
                                <span className="x-alert-text">Apenas administradores podem criar partidas.</span>
                            </div>
                        </div>
                    )}

                    {/* Lista */}
                    <div className="x-page-head" style={{ marginBottom: 20 }}>
                        <div>
                            <h2 className="x-h3">Partidas</h2>
                            <p className="x-page-sub">Clique numa partida para ver detalhes.</p>
                        </div>
                        <span className="x-pill">{totalPartidas}</span>
                    </div>

                    {partidas.length === 0 ? (
                        <div className="x-empty">
                            <div className="x-empty-icon">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            <h3 className="x-empty-title">Nenhuma partida ainda</h3>
                            <p className="x-empty-text">
                                {souAdmin
                                    ? "Crie a primeira partida e mande o link no grupo."
                                    : "Espere o administrador criar uma partida."}
                            </p>
                            {souAdmin && !showCreate && (
                                <button className="x-btn sm" onClick={() => setShowCreate(true)}>
                                    Criar primeira partida <span className="x-btn-arr">+</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="x-list">
                            {partidasPaginadas.map((p) => {
                                const ts = new Date(p.dataHora).getTime();
                                const now = Date.now();
                                const status = (p.statusPartida ?? "").toUpperCase();
                                const emAndamento = status === "LISTA_FECHADA" || status === "AVALIACAO_LIBERADA";
                                const encerrada = status === "ENCERRADA";
                                const isFuture = !Number.isNaN(ts) && ts >= now && !emAndamento && !encerrada;
                                const { dia, mes, hora, weekday } = fmtDateBox(p.dataHora);
                                const limite = p.limiteParticipantes ?? null;
                                const vagas = limite != null ? Math.max(0, limite - (p.totalConfirmados ?? 0)) : null;
                                const statusLabel =
                                    status === "AVALIACAO_LIBERADA" ? "Em avaliação" :
                                    status === "LISTA_FECHADA" ? "Lista fechada" :
                                    encerrada ? "Encerrada" :
                                    isFuture ? "Próxima" : "Histórico";
                                const statusClass = (status === "AVALIACAO_LIBERADA" || status === "LISTA_FECHADA") ? "accent" : "";

                                return (
                                    <button key={p.id} className="x-list-item" onClick={() => nav(`/partidas/${p.id}`)}>
                                        <div className={`x-date-box ${isFuture ? "future" : ""}`}>
                                            <span className="x-date-box-day">{dia}</span>
                                            <span className="x-date-box-month">{mes}</span>
                                        </div>
                                        <div className="x-list-item-main">
                                            <div className="x-list-item-title">
                                                {weekday} · {hora}
                                            </div>
                                            <div className="x-list-item-sub">
                                                <span style={{ color: "var(--x-accent)", fontWeight: 700 }}>
                                                    {p.totalConfirmados ?? 0}
                                                    {limite != null ? ` de ${limite}` : ""} confirmado{(p.totalConfirmados ?? 0) !== 1 ? "s" : ""}
                                                </span>
                                                {vagas != null && (
                                                    <>
                                                        <span className="sep">·</span>
                                                        <span>{vagas} vaga{vagas !== 1 ? "s" : ""}</span>
                                                    </>
                                                )}
                                                <span className="sep">·</span>
                                                <span className={`x-pill ${statusClass}`} style={{ padding: "3px 8px", fontSize: 9 }}>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="x-list-item-right">
                                            <span className="x-chev">→</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {totalPartidas > PAGE_SIZE && (
                        <div className="x-pager">
                            <div className="x-pager-info">
                                Mostrando <b>{pageStart + 1}</b>–<b>{pageEnd}</b> de <b>{totalPartidas}</b>
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
            </main>
        </div>
    );
}
