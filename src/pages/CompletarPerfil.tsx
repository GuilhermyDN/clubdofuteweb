import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { uploadFotoPerfil } from "../services/eu";
import { toast } from "../components/Toast";
import { explainError } from "../utils/errors";
import { maskPeso, maskAltura } from "../utils/masks";
import { isLoggedIn } from "../utils/auth";

function toNum(v: string): number | null {
    const t = (v ?? "").trim();
    if (!t) return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

type Errs = { peso?: string; altura?: string };

export default function CompletarPerfil() {
    const nav = useNavigate();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [nome, setNome] = useState("");
    const [peso, setPeso] = useState("");
    const [altura, setAltura] = useState("");
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Errs>({});

    useEffect(() => {
        if (!isLoggedIn()) { nav("/login", { replace: true }); return; }
        api.get("/eu").then(res => {
            const d = res.data;
            setNome(d.nome ?? "");
            if (d.peso && d.altura) nav("/equipes", { replace: true });
        }).catch(() => {});
    }, [nav]);

    const initials = (() => {
        const n = nome.trim();
        if (!n) return "?";
        const parts = n.split(/\s+/).filter(Boolean);
        const a = parts[0]?.[0] ?? "?";
        const b = parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "";
        return (a + b).toUpperCase();
    })();

    async function onPickFoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.warn("A imagem precisa ter no máximo 5 MB."); return; }
        if (!file.type.startsWith("image/")) { toast.warn("Selecione um arquivo de imagem."); return; }
        try {
            setUploadingFoto(true);
            setPhotoPreview(URL.createObjectURL(file));
            await uploadFotoPerfil(file);
            toast.success("Foto adicionada!");
        } catch (err: any) {
            toast.error(explainError(err), "Falha ao enviar foto");
            setPhotoPreview(null);
        } finally {
            setUploadingFoto(false);
        }
    }

    function validate(): Errs {
        const e: Errs = {};
        if (!peso.trim()) {
            e.peso = "Informe seu peso.";
        } else {
            const n = toNum(peso);
            if (n === null || n <= 0) e.peso = "Peso inválido.";
            else if (n > 300) e.peso = "Peso máximo é 300 kg.";
        }
        if (!altura.trim()) {
            e.altura = "Informe sua altura.";
        } else {
            const n = toNum(altura);
            if (n === null || n <= 0) e.altura = "Altura inválida.";
            else if (n > 3) e.altura = "Altura máxima é 3 m.";
        }
        return e;
    }

    async function handleSubmit(ev?: React.FormEvent) {
        ev?.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length > 0) { toast.warn("Preencha o peso e a altura.", "Dados inválidos"); return; }
        try {
            setSaving(true);
            await api.patch("/eu", { peso: toNum(peso), altura: toNum(altura) });
            toast.success("Perfil completo! Bora jogar.", "Tudo certo");
            nav("/equipes", { replace: true });
        } catch (err: any) {
            toast.error(explainError(err), "Falha ao salvar");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="x-auth">
            <aside className="x-auth-cover">
                <button className="x-brand" onClick={() => nav("/")}>
                    <span className="x-brand-mark"><img src="/icon-bola.png" alt="" /></span>
                    <span className="x-brand-name">ClubeDoFut</span>
                </button>

                <h1 className="x-auth-quote">
                    Últimos detalhes<br />
                    para o<br />
                    <em>melhor time</em>.
                </h1>

                <div className="x-auth-meta">
                    <span className="d" /> Passo 2 de 2 · Onboarding
                </div>
            </aside>

            <section className="x-auth-panel">
                <form className="x-auth-inner" onSubmit={handleSubmit} noValidate>
                    <div className="x-eyebrow">Completar perfil</div>
                    <h2 className="x-auth-title">
                        Quase <br /><em>lá</em>.
                    </h2>
                    <p className="x-auth-sub">
                        Peso e altura são usados pela IA para montar times equilibrados.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 24 }}>
                        <div className="x-avatar-wrap" style={{ position: "relative" }}>
                            {photoPreview ? (
                                <img
                                    src={photoPreview}
                                    alt="Foto"
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
                                aria-label="Adicionar foto"
                                title="Adicionar foto (opcional)"
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
                        <span style={{ fontSize: 12, color: "var(--x-text-3)" }}>
                            Foto de perfil (opcional)
                        </span>
                    </div>

                    <div className="x-auth-fields">
                        <div className="x-field">
                            <label>Peso (kg)</label>
                            <input
                                className={`x-input ${errors.peso ? "has-err" : ""}`}
                                placeholder="75.5"
                                inputMode="numeric"
                                value={peso}
                                onChange={(e) => {
                                    setPeso(maskPeso(e.target.value));
                                    if (errors.peso) setErrors(p => ({ ...p, peso: undefined }));
                                }}
                            />
                            {errors.peso && <div className="x-field-error">⚠ {errors.peso}</div>}
                        </div>

                        <div className="x-field">
                            <label>Altura (m)</label>
                            <input
                                className={`x-input ${errors.altura ? "has-err" : ""}`}
                                placeholder="1.85"
                                inputMode="numeric"
                                value={altura}
                                onChange={(e) => {
                                    setAltura(maskAltura(e.target.value));
                                    if (errors.altura) setErrors(p => ({ ...p, altura: undefined }));
                                }}
                            />
                            {errors.altura && <div className="x-field-error">⚠ {errors.altura}</div>}
                        </div>
                    </div>

                    <button type="submit" className="x-btn block lg" disabled={saving} style={{ marginTop: 8 }}>
                        {saving ? "Salvando..." : "Começar a jogar"} <span className="x-btn-arr">→</span>
                    </button>

                    <button
                        type="button"
                        className="x-auth-alt"
                        onClick={() => nav("/equipes", { replace: true })}
                    >
                        Pular por agora
                    </button>

                    <div className="x-auth-foot">v4.1.23 · Onboarding</div>
                </form>
            </section>
        </div>
    );
}
