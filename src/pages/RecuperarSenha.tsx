import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { recuperarSenha } from "../services/auth";
import { toast } from "../components/Toast";
import { explainError, isNotImplemented } from "../utils/errors";

function maskTelefone(v: string) {
    const nums = v.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

export default function RecuperarSenha() {
    const nav = useNavigate();
    const [telefone, setTelefone] = useState("");
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function handleEnviar(ev?: React.FormEvent) {
        ev?.preventDefault();
        const tel = telefone.trim();
        if (!tel || tel.length < 10) {
            toast.warn("Informe um telefone válido.");
            return;
        }
        setErr(null);
        try {
            setLoading(true);
            await recuperarSenha(tel);
            setEnviado(true);
            toast.success("Se houver conta vinculada, enviaremos instruções.");
        } catch (e: any) {
            if (isNotImplemented(e)) {
                setErr("A recuperação automática ainda não está ativa. Entre em contato com o suporte pra redefinir sua senha.");
            } else {
                toast.error(explainError(e), "Falha ao processar");
            }
        } finally {
            setLoading(false);
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
                    Esqueceu<br />
                    a senha? <em>Relaxa.</em><br />
                    A gente ajeita.
                </h1>

                <div className="x-auth-meta">
                    <span className="d" /> Recuperação · v4.1.23
                </div>
            </aside>

            <section className="x-auth-panel">
                {enviado ? (
                    <div className="x-auth-inner">
                        <div className="x-eyebrow">Pronto</div>
                        <h2 className="x-auth-title">
                            Verifique seu<br /><em>WhatsApp</em>.
                        </h2>
                        <p className="x-auth-sub">
                            Se existe uma conta com o número <strong style={{ color: "var(--x-text)" }}>{maskTelefone(telefone)}</strong>,
                            você receberá instruções pra redefinir a senha em instantes.
                        </p>
                        <button className="x-btn block lg" onClick={() => nav("/login")}>
                            Voltar para o login <span className="x-btn-arr">→</span>
                        </button>
                        <button className="x-auth-alt" onClick={() => { setEnviado(false); setTelefone(""); }}>
                            Usar outro telefone
                        </button>
                    </div>
                ) : (
                    <form className="x-auth-inner" onSubmit={handleEnviar} noValidate>
                        <div className="x-eyebrow">Recuperar senha</div>
                        <h2 className="x-auth-title">
                            Redefinir<br /><em>senha</em>.
                        </h2>
                        <p className="x-auth-sub">
                            Informe o telefone cadastrado. Enviaremos instruções pra criar uma nova senha.
                        </p>

                        {err && (
                            <div className="x-alert warn" style={{ marginBottom: 20 }}>
                                <div>
                                    <span className="x-alert-title">Indisponível</span>
                                    <span className="x-alert-text">{err}</span>
                                </div>
                            </div>
                        )}

                        <div className="x-auth-fields">
                            <div className="x-field">
                                <label>Telefone cadastrado</label>
                                <input
                                    className="x-input"
                                    placeholder="(00) 00000-0000"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    value={maskTelefone(telefone)}
                                    onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))}
                                />
                            </div>
                        </div>

                        <button type="submit" className="x-btn block lg" disabled={loading} style={{ marginTop: 22 }}>
                            {loading ? "Enviando..." : "Enviar instruções"} <span className="x-btn-arr">→</span>
                        </button>

                        <button type="button" className="x-auth-alt" onClick={() => nav("/login")}>
                            Lembrou a senha? <u>Fazer login</u>
                        </button>

                        <div className="x-auth-foot">v4.1.23 · #2</div>
                    </form>
                )}
            </section>
        </div>
    );
}
