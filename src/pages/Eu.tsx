import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import AppHeader from "../components/AppHeader";
import { toast } from "../components/Toast";
import { explainError, isAuthError } from "../utils/errors";

type EuResponse = {
    id: number;
    nome: string;
    telefone: string;
    cep: string;
    peso: number;
    altura: number;
    notaVolei: number;
    notaFutevolei: number;
    criadoEm: string;
};

type MinhaEquipeResumo = {
    id: number;
    nome: string;
    esporte: "VOLEI" | "FUTEVOLEI" | string;
    statusEquipe: "ABERTA" | "FECHADA" | string;
    totalMembros: number;
};

function toNumOrNull(v: string) {
    const t = (v ?? "").trim();
    if (!t) return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}
function normStrToStr(v: any) { return (v ?? "").toString().trim(); }
function normNumOrNull(v: any) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}
function fmtISO(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR");
}
function maskAltura(v: string) {
    const nums = v.replace(/\D/g, "").slice(0, 3);
    if (nums.length <= 1) return nums;
    if (nums.length === 2) return `${nums[0]}.${nums[1]}`;
    return `${nums[0]}.${nums.slice(1)}`;
}

export default function EuPage() {
    const nav = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<EuResponse | null>(null);
    const [equipesMembro, setEquipesMembro] = useState<MinhaEquipeResumo[]>([]);
    const [equipesAdmin, setEquipesAdmin] = useState<MinhaEquipeResumo[]>([]);

    const [telefone, setTelefone] = useState("");
    const [cep, setCep] = useState("");
    const [peso, setPeso] = useState("");
    const [altura, setAltura] = useState("");
    const [notaVolei, setNotaVolei] = useState("");
    const [notaFutevolei, setNotaFutevolei] = useState("");

    const originalRef = useRef<{
        telefone: string; cep: string; peso: number | null; altura: number | null;
        notaVolei: number | null; notaFutevolei: number | null;
    } | null>(null);

    async function load() {
        setLoading(true);
        try {
            const [meRes, membroRes, adminRes] = await Promise.all([
                api.get<EuResponse>("/eu"),
                api.get<MinhaEquipeResumo[]>("/eu/equipes"),
                api.get<MinhaEquipeResumo[]>("/eu/equipes-administrador"),
            ]);
            const d = meRes.data;
            setData(d);
            setEquipesMembro(membroRes.data ?? []);
            setEquipesAdmin(adminRes.data ?? []);

            const o = {
                telefone: normStrToStr(d.telefone),
                cep: normStrToStr(d.cep),
                peso: normNumOrNull(d.peso),
                altura: normNumOrNull(d.altura),
                notaVolei: normNumOrNull(d.notaVolei),
                notaFutevolei: normNumOrNull(d.notaFutevolei),
            };
            originalRef.current = o;
            setTelefone(o.telefone);
            setCep(o.cep);
            setPeso(o.peso === null ? "" : String(o.peso));
            setAltura(o.altura === null ? "" : String(o.altura));
            setNotaVolei(o.notaVolei === null ? "" : String(o.notaVolei));
            setNotaFutevolei(o.notaFutevolei === null ? "" : String(o.notaFutevolei));
        } catch (e: any) {
            if (isAuthError(e)) return; // interceptor já redireciona
            toast.error(explainError(e), "Falha ao carregar perfil");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    const initials = useMemo(() => {
        const n = (data?.nome ?? "").trim();
        if (!n) return "EU";
        const parts = n.split(/\s+/).filter(Boolean);
        const a = parts[0]?.[0] ?? "E";
        const b = parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "U";
        return (a + b).toUpperCase();
    }, [data?.nome]);

    const normalized = useMemo(() => {
        const notaStrToIntOrNull = (s: string) => {
            const t = (s ?? "").trim();
            if (!t) return null;
            const n = Number(t);
            if (!Number.isFinite(n)) return null;
            const i = Math.trunc(n);
            if (i < 0) return 0;
            if (i > 10) return 10;
            return i;
        };
        return {
            telefone: normStrToStr(telefone),
            cep: normStrToStr(cep),
            peso: peso.trim() ? toNumOrNull(peso) : null,
            altura: altura.trim() ? toNumOrNull(altura) : null,
            notaVolei: notaStrToIntOrNull(notaVolei),
            notaFutevolei: notaStrToIntOrNull(notaFutevolei),
        };
    }, [telefone, cep, peso, altura, notaVolei, notaFutevolei]);

    const hasChanges = useMemo(() => {
        const o = originalRef.current;
        if (!o) return false;
        return (
            o.telefone !== normalized.telefone ||
            o.cep !== normalized.cep ||
            o.peso !== normalized.peso ||
            o.altura !== normalized.altura ||
            o.notaVolei !== normalized.notaVolei ||
            o.notaFutevolei !== normalized.notaFutevolei
        );
    }, [normalized]);

    async function onSalvar() {
        const o = originalRef.current;
        if (!o) return;
        if (!hasChanges) { toast.info("Nada para salvar."); return; }

        const patch: any = {};
        if (o.telefone !== normalized.telefone) patch.telefone = normalized.telefone;
        if (o.cep !== normalized.cep) patch.cep = normalized.cep;
        if (o.peso !== normalized.peso) patch.peso = normalized.peso ?? 0;
        if (o.altura !== normalized.altura) patch.altura = normalized.altura ?? 0;
        if (o.notaVolei !== normalized.notaVolei) patch.notaVolei = normalized.notaVolei ?? 0;
        if (o.notaFutevolei !== normalized.notaFutevolei) patch.notaFutevolei = normalized.notaFutevolei ?? 0;

        try {
            setSaving(true);
            await api.patch("/eu", patch);
            toast.success("Perfil atualizado.");
            nav("/equipes");
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha ao salvar");
        } finally {
            setSaving(false);
        }
    }

    const notaOptions = useMemo(() => Array.from({ length: 11 }, (_, i) => i), []);

    if (loading) {
        return (
            <div className="x-app">
                <AppHeader />
                <main className="x-app-main">
                    <div className="x-loading">
                        <div className="x-spinner" />
                        Carregando perfil...
                    </div>
                </main>
            </div>
        );
    }
    if (!data) return null;

    return (
        <div className="x-app">
            <AppHeader />

            <main className="x-app-main">
                <div className="x-app-narrow">
                    {/* Cover image banner */}
                    <div className="x-cover x-reveal">
                        <img src="/quadra-areia.jpg" alt="" />
                        <span className="x-cover-badge">Atleta · Membro</span>
                    </div>

                    {/* Header card com avatar */}
                    <div className="x-profile-card x-reveal">
                        <div className="x-avatar xl">{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 className="x-page-title">{data.nome}</h1>
                            <p className="x-page-sub">{data.telefone} · ID #{data.id}</p>
                        </div>
                    </div>

                    {/* Conta */}
                    <div className="x-card" style={{ marginBottom: 20 }}>
                        <div className="x-card-title">Conta</div>
                        <hr className="x-divider" />
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                            <span className="x-meta">Criado em</span>
                            <strong style={{ fontSize: 14, fontWeight: 600 }}>{fmtISO(data.criadoEm)}</strong>
                        </div>
                    </div>

                    {/* Dados do perfil */}
                    <div className="x-card" style={{ marginBottom: 20 }}>
                        <div className="x-card-title">Dados do perfil</div>
                        <hr className="x-divider" />

                        <div className="x-form-grid" style={{ marginBottom: 20 }}>
                            <div className="x-field">
                                <label>Telefone</label>
                                <input className="x-input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                            </div>
                            <div className="x-field">
                                <label>CEP</label>
                                <input className="x-input" value={cep} onChange={(e) => setCep(e.target.value)} />
                            </div>
                            <div className="x-field">
                                <label>Peso (kg)</label>
                                <input className="x-input" value={peso} onChange={(e) => setPeso(e.target.value)} />
                            </div>
                            <div className="x-field">
                                <label>Altura (m)</label>
                                <input
                                    className="x-input"
                                    value={maskAltura(altura)}
                                    onChange={(e) => setAltura(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                />
                            </div>
                            <div className="x-field">
                                <label>Nota Vôlei</label>
                                <select className="x-select" value={notaVolei} onChange={(e) => setNotaVolei(e.target.value)}>
                                    <option value="">—</option>
                                    {notaOptions.map((n) => <option key={n} value={String(n)}>{n}</option>)}
                                </select>
                            </div>
                            <div className="x-field">
                                <label>Nota Futevôlei</label>
                                <select className="x-select" value={notaFutevolei} onChange={(e) => setNotaFutevolei(e.target.value)}>
                                    <option value="">—</option>
                                    {notaOptions.map((n) => <option key={n} value={String(n)}>{n}</option>)}
                                </select>
                            </div>
                        </div>

                        <button className="x-btn" onClick={onSalvar} disabled={!hasChanges || saving}>
                            {saving ? "Salvando..." : "Salvar alterações"}
                        </button>
                    </div>

                    {/* Equipes que administro */}
                    <div className="x-card" style={{ marginBottom: 20 }}>
                        <div className="x-card-title">
                            Sou administrador
                            <span className="x-pill">{equipesAdmin.length}</span>
                        </div>
                        <hr className="x-divider" />
                        {equipesAdmin.length === 0 ? (
                            <div className="x-empty" style={{ padding: 32 }}>
                                <div className="x-empty-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                        <path d="M12 2v20M2 12h20" />
                                    </svg>
                                </div>
                                <p className="x-empty-text">Você ainda não administra nenhuma equipe.</p>
                                <button className="x-btn sm" onClick={() => nav("/equipes")}>Criar equipe <span className="x-btn-arr">+</span></button>
                            </div>
                        ) : (
                            <div className="x-list">
                                {equipesAdmin.map((t) => (
                                    <button key={t.id} className="x-list-item" onClick={() => nav(`/equipes/${t.id}`)}>
                                        <div className="x-avatar sm">{t.nome.charAt(0).toUpperCase()}</div>
                                        <div className="x-list-item-main">
                                            <div className="x-list-item-title">{t.nome}</div>
                                            <div className="x-list-item-sub">
                                                <span>{t.esporte}</span>
                                                <span className="sep">·</span>
                                                <span>{t.totalMembros} membros</span>
                                            </div>
                                        </div>
                                        <div className="x-list-item-right">
                                            <span className="x-pill accent">Admin</span>
                                            <span className="x-chev">→</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Minhas equipes */}
                    <div className="x-card">
                        <div className="x-card-title">
                            Minhas equipes
                            <span className="x-pill">{equipesMembro.length}</span>
                        </div>
                        <hr className="x-divider" />
                        {equipesMembro.length === 0 ? (
                            <div className="x-empty" style={{ padding: 32 }}>
                                <div className="x-empty-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    </svg>
                                </div>
                                <p className="x-empty-text">Você ainda não participa de nenhuma equipe.</p>
                                <button className="x-btn sm" onClick={() => nav("/equipes")}>Descobrir equipes <span className="x-btn-arr">→</span></button>
                            </div>
                        ) : (
                            <div className="x-list">
                                {equipesMembro.map((t) => (
                                    <button key={t.id} className="x-list-item" onClick={() => nav(`/equipes/${t.id}`)}>
                                        <div className="x-avatar sm teal">{t.nome.charAt(0).toUpperCase()}</div>
                                        <div className="x-list-item-main">
                                            <div className="x-list-item-title">{t.nome}</div>
                                            <div className="x-list-item-sub">
                                                <span>{t.esporte}</span>
                                                <span className="sep">·</span>
                                                <span>{t.totalMembros} membros</span>
                                            </div>
                                        </div>
                                        <div className="x-list-item-right">
                                            <span className="x-chev">→</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
