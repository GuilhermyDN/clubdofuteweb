import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import AppHeader from "../components/AppHeader";
import { toast } from "../components/Toast";
import { explainError, isAuthError } from "../utils/errors";
import { clearToken } from "../utils/auth";
import { maskTelefone, maskCEP, maskAltura, maskPeso } from "../utils/masks";
import { uploadFotoPerfil } from "../services/eu";

type EuResponse = {
    id: number;
    nome: string;
    telefone: string;
    cep: string;
    peso: number;
    altura: number;
    notaVolei: number;
    notaFutevolei: number;
    fotoPerfil?: string | null;
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
export default function EuPage() {
    const nav = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    async function onPickFoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ""; // permite re-selecionar o mesmo arquivo depois
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.warn("A imagem precisa ter no máximo 5 MB.");
            return;
        }
        if (!file.type.startsWith("image/")) {
            toast.warn("Selecione um arquivo de imagem.");
            return;
        }
        try {
            setUploadingFoto(true);
            const updated = await uploadFotoPerfil(file);
            setData((prev) => (prev ? { ...prev, fotoPerfil: updated.fotoPerfil ?? null } : prev));
            toast.success("Foto atualizada!");
        } catch (e2: any) {
            if (!isAuthError(e2)) toast.error(explainError(e2), "Falha ao enviar foto");
        } finally {
            setUploadingFoto(false);
        }
    }
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
            setTelefone(maskTelefone(o.telefone));
            setCep(maskCEP(o.cep));
            setPeso(o.peso === null ? "" : maskPeso(String(o.peso).replace(/\D/g, "")));
            setAltura(o.altura === null ? "" : maskAltura(String(o.altura).replace(/\D/g, "")));
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
            setEditMode(false);
            await load();
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha ao salvar");
        } finally {
            setSaving(false);
        }
    }

    function onCancelarEdicao() {
        const o = originalRef.current;
        if (o) {
            setTelefone(maskTelefone(o.telefone));
            setCep(maskCEP(o.cep));
            setPeso(o.peso === null ? "" : maskPeso(String(o.peso).replace(/\D/g, "")));
            setAltura(o.altura === null ? "" : maskAltura(String(o.altura).replace(/\D/g, "")));
            setNotaVolei(o.notaVolei === null ? "" : String(o.notaVolei));
            setNotaFutevolei(o.notaFutevolei === null ? "" : String(o.notaFutevolei));
        }
        setEditMode(false);
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
                    <button
                        className="x-phero-back"
                        onClick={() => (window.history.length > 1 ? nav(-1) : nav("/equipes"))}
                        style={{ marginBottom: 16 }}
                    >
                        ← Voltar
                    </button>

                    {/* Cover image banner */}
                    <div className="x-cover x-reveal">
                        <img src="/quadra-areia.jpg" alt="" />
                        <span className="x-cover-badge">Atleta · Membro</span>
                    </div>

                    {/* Header card com avatar */}
                    <div className="x-profile-card x-reveal">
                        <div
                            className="x-avatar-wrap"
                            style={{ position: "relative", flexShrink: 0 }}
                        >
                            {data.fotoPerfil ? (
                                <img
                                    src={data.fotoPerfil}
                                    alt={data.nome}
                                    className="x-avatar xl"
                                    style={{ objectFit: "cover", padding: 0 }}
                                />
                            ) : (
                                <div className="x-avatar xl">{initials}</div>
                            )}
                            <button
                                type="button"
                                className="x-avatar-cam"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFoto}
                                aria-label="Alterar foto"
                                title="Alterar foto"
                            >
                                {uploadingFoto ? (
                                    <div className="x-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                        <circle cx="12" cy="13" r="4" />
                                    </svg>
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={onPickFoto}
                                style={{ display: "none" }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 className="x-page-title">{data.nome}</h1>
                            <p className="x-page-sub">{data.telefone}</p>
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
                        <div className="x-card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span>Dados do perfil</span>
                            {!editMode ? (
                                <button
                                    type="button"
                                    className="x-btn ghost sm"
                                    onClick={() => setEditMode(true)}
                                    title="Editar dados"
                                    aria-label="Editar dados"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                    </svg>
                                    Editar
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="x-btn ghost sm"
                                    onClick={onCancelarEdicao}
                                    title="Cancelar edição"
                                    aria-label="Cancelar edição"
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                        <hr className="x-divider" />

                        <div className="x-form-grid" style={{ marginBottom: 20 }}>
                            <div className="x-field">
                                <label>Telefone</label>
                                <input
                                    className="x-input"
                                    inputMode="numeric"
                                    placeholder="(11) 99999-9999"
                                    value={telefone}
                                    onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                                    readOnly={!editMode}
                                    disabled={!editMode}
                                />
                            </div>
                            <div className="x-field">
                                <label>CEP</label>
                                <input
                                    className="x-input"
                                    inputMode="numeric"
                                    placeholder="00000-000"
                                    value={cep}
                                    onChange={(e) => setCep(maskCEP(e.target.value))}
                                    readOnly={!editMode}
                                    disabled={!editMode}
                                />
                            </div>
                            <div className="x-field">
                                <label>Peso (kg)</label>
                                <input
                                    className="x-input"
                                    inputMode="numeric"
                                    placeholder="75.5"
                                    value={peso}
                                    onChange={(e) => setPeso(maskPeso(e.target.value))}
                                    readOnly={!editMode}
                                    disabled={!editMode}
                                />
                            </div>
                            <div className="x-field">
                                <label>Altura (m)</label>
                                <input
                                    className="x-input"
                                    inputMode="numeric"
                                    placeholder="1.85"
                                    value={altura}
                                    onChange={(e) => setAltura(maskAltura(e.target.value))}
                                    readOnly={!editMode}
                                    disabled={!editMode}
                                />
                            </div>
                            <div className="x-field">
                                <label>Nota Vôlei</label>
                                <select className="x-select" value={notaVolei} onChange={(e) => setNotaVolei(e.target.value)} disabled={!editMode}>
                                    <option value="">—</option>
                                    {notaOptions.map((n) => <option key={n} value={String(n)}>{n}</option>)}
                                </select>
                            </div>
                            <div className="x-field">
                                <label>Nota Futevôlei</label>
                                <select className="x-select" value={notaFutevolei} onChange={(e) => setNotaFutevolei(e.target.value)} disabled={!editMode}>
                                    <option value="">—</option>
                                    {notaOptions.map((n) => <option key={n} value={String(n)}>{n}</option>)}
                                </select>
                            </div>
                        </div>

                        {editMode && (
                            <button className="x-btn" onClick={onSalvar} disabled={!hasChanges || saving}>
                                {saving ? "Salvando..." : "Salvar alterações"}
                            </button>
                        )}
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

                    {/* Sair da conta */}
                    <div className="x-logout-card">
                        <div>
                            <div className="x-logout-title">Sair da conta</div>
                            <div className="x-logout-sub">
                                Você precisará entrar de novo com seu telefone e senha.
                            </div>
                        </div>
                        <button
                            className="x-btn ghost"
                            onClick={() => {
                                clearToken();
                                toast.info("Você saiu do clube. Até a próxima!");
                                nav("/");
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Sair
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
