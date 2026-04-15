import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../services/auth";
import { setToken, isLoggedIn } from "../utils/auth";
import { toast } from "../components/Toast";
import { explainError } from "../utils/errors";

function EyeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}

function maskTelefone(v: string) {
    const nums = v.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

type Errors = {
    telefone?: string;
    senha?: string;
};

export default function Login() {
    const nav = useNavigate();
    const [params] = useSearchParams();
    const nextUrl = params.get("next");

    const [telefone, setTelefone] = useState("");
    const [senha, setSenha] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Errors>({});

    useEffect(() => {
        if (isLoggedIn()) nav(nextUrl || "/eu", { replace: true });
    }, [nav, nextUrl]);

    function validate(): Errors {
        const e: Errors = {};
        const tel = telefone.trim();
        if (!tel) e.telefone = "Informe seu telefone.";
        else if (tel.length < 10) e.telefone = "Telefone incompleto.";

        if (!senha) e.senha = "Informe sua senha.";
        else if (senha.length < 8) e.senha = "Mínimo de 8 caracteres.";
        return e;
    }

    async function handleLogin(ev?: React.FormEvent) {
        ev?.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length > 0) {
            toast.warn("Verifique os campos do formulário.", "Dados inválidos");
            return;
        }

        try {
            setLoading(true);
            const data = await login({ telefone: telefone.trim(), senha });
            const token = data?.token || data?.accessToken || data?.jwt;
            if (!token) {
                toast.error("O servidor não retornou um token válido.", "Falha no login");
                return;
            }
            setToken(token);
            toast.success("Bem-vindo de volta ao clube!", "Login realizado");
            nav(nextUrl || "/eu", { replace: true });
        } catch (err: any) {
            toast.error(explainError(err), "Falha no login");
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
                    Volta pro clube.<br />
                    Seu próximo <em>rachão</em><br />
                    tá te esperando.
                </h1>

                <div className="x-auth-meta">
                    <span className="d" /> Acesso de membros · v4.1.23
                </div>
            </aside>

            <section className="x-auth-panel">
                <form className="x-auth-inner" onSubmit={handleLogin} noValidate>
                    <div className="x-eyebrow">Entrar</div>
                    <h2 className="x-auth-title">
                        Bem-vindo<br /><em>de volta</em>.
                    </h2>
                    <p className="x-auth-sub">
                        Entre com seu telefone e senha para acessar suas equipes.
                    </p>

                    <div className="x-auth-tabs">
                        <button type="button" className="active">Entrar</button>
                        <button type="button" onClick={() => nav("/register")}>Criar conta</button>
                    </div>

                    <div className="x-auth-fields">
                        <div className="x-field">
                            <label>Telefone</label>
                            <input
                                className={`x-input ${errors.telefone ? "has-err" : ""}`}
                                placeholder="(00) 00000-0000"
                                inputMode="tel"
                                autoComplete="tel"
                                value={maskTelefone(telefone)}
                                onChange={(e) => {
                                    setTelefone(e.target.value.replace(/\D/g, ""));
                                    if (errors.telefone) setErrors((p) => ({ ...p, telefone: undefined }));
                                }}
                            />
                            {errors.telefone && <div className="x-field-error">⚠ {errors.telefone}</div>}
                        </div>

                        <div className="x-field">
                            <label>Senha</label>
                            <div className="x-input-wrap">
                                <input
                                    className={`x-input ${errors.senha ? "has-err" : ""}`}
                                    type={showPass ? "text" : "password"}
                                    placeholder="No mínimo 8 caracteres"
                                    autoComplete="current-password"
                                    value={senha}
                                    onChange={(e) => {
                                        setSenha(e.target.value);
                                        if (errors.senha) setErrors((p) => ({ ...p, senha: undefined }));
                                    }}
                                />
                                <button
                                    type="button"
                                    className="x-input-icon"
                                    onClick={() => setShowPass(v => !v)}
                                    aria-label="Mostrar/ocultar senha"
                                >
                                    <EyeIcon />
                                </button>
                            </div>
                            {errors.senha && <div className="x-field-error">⚠ {errors.senha}</div>}
                        </div>
                    </div>

                    <div className="x-auth-help">
                        Esqueceu a senha? A recuperação é feita via telefone.
                    </div>

                    <button type="submit" className="x-btn block lg" disabled={loading}>
                        {loading ? "Entrando..." : "Entrar"} <span className="x-btn-arr">→</span>
                    </button>

                    <button type="button" className="x-auth-alt" onClick={() => nav("/register")}>
                        Primeira vez por aqui? <u>Criar minha conta</u>
                    </button>

                    <div className="x-auth-foot">
                        v4.1.23 · #2
                    </div>
                </form>
            </section>
        </div>
    );
}
