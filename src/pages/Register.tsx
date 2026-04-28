import { useEffect, useState } from "react";
import { cadastrar, login } from "../services/auth";
import { useNavigate } from "react-router-dom";
import { isLoggedIn, setToken } from "../utils/auth";
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

function maskCEP(v: string) {
    const nums = v.replace(/\D/g, "").slice(0, 8);
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5)}`;
}

type Errors = {
    nome?: string;
    telefone?: string;
    cep?: string;
    senha?: string;
    notaVolei?: string;
    notaFutevolei?: string;
};

const NOTA_OPTIONS = Array.from({ length: 11 }, (_, i) => i);

export default function Register() {
    const nav = useNavigate();

    const [successOpen, setSuccessOpen] = useState(false);
    const [nome, setNome] = useState("");
    const [telefone, setTelefone] = useState("");
    const [cep, setCep] = useState("");
    const [senha, setSenha] = useState("");
    const [notaVolei, setNotaVolei] = useState("");
    const [notaFutevolei, setNotaFutevolei] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Errors>({});

    useEffect(() => {
        if (isLoggedIn()) nav("/eu", { replace: true });
    }, [nav]);

    function validate(): Errors {
        const e: Errors = {};
        if (!nome.trim()) e.nome = "Informe seu nome completo.";
        else if (nome.trim().split(/\s+/).length < 2) e.nome = "Digite nome e sobrenome.";

        if (!telefone) e.telefone = "Informe seu telefone.";
        else if (telefone.length < 10) e.telefone = "Telefone incompleto.";

        if (!cep) e.cep = "Informe seu CEP.";
        else if (cep.length !== 8) e.cep = "CEP deve ter 8 dígitos.";

        if (!senha) e.senha = "Crie uma senha.";
        else if (senha.length < 8) e.senha = "Mínimo de 8 caracteres.";

        if (notaVolei === "") e.notaVolei = "Informe sua nota.";
        if (notaFutevolei === "") e.notaFutevolei = "Informe sua nota.";
        return e;
    }

    async function handleRegister(ev?: React.FormEvent) {
        ev?.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length > 0) {
            toast.warn("Verifique os campos do formulário.", "Dados inválidos");
            return;
        }

        try {
            setLoading(true);
            const data = await cadastrar({
                nome: nome.trim(),
                telefone,
                cep,
                senha,
                notaVolei: Number(notaVolei),
                notaFutevolei: Number(notaFutevolei),
            });

            // se o cadastro já retornar token, pula o modal e vai direto pro app
            const tokenDireto = data?.token || data?.accessToken || data?.jwt;
            if (tokenDireto) {
                setToken(tokenDireto);
                toast.success("Bem-vindo ao clube!", "Conta criada");
                nav("/eu", { replace: true });
                return;
            }

            // tenta login automático logo após o cadastro
            try {
                const loginRes = await login({ telefone, senha });
                const token = loginRes?.token || loginRes?.accessToken || loginRes?.jwt;
                if (token) {
                    setToken(token);
                    toast.success("Bem-vindo ao clube!", "Conta criada");
                    nav("/eu", { replace: true });
                    return;
                }
            } catch {
                // se falhar, só mostra o modal de sucesso manual
            }

            toast.success("Conta criada com sucesso.", "Pronto!");
            setSuccessOpen(true);
        } catch (err: any) {
            toast.error(explainError(err), "Falha no cadastro");
        } finally {
            setLoading(false);
        }
    }

    function goToLogin() {
        setSuccessOpen(false);
        nav("/login");
    }

    return (
        <div className="x-auth">
            <aside className="x-auth-cover">
                <button className="x-brand" onClick={() => nav("/")}>
                    <span className="x-brand-mark"><img src="/icon-bola.png" alt="" /></span>
                    <span className="x-brand-name">ClubeDoFut</span>
                </button>

                <h1 className="x-auth-quote">
                    Entre para o clube.<br />
                    É <em>grátis</em> —<br />
                    sempre será.
                </h1>

                <div className="x-auth-meta">
                    <span className="d" /> Cadastro novo · v4.1.23
                </div>
            </aside>

            <section className="x-auth-panel">
                <form className="x-auth-inner" onSubmit={handleRegister} noValidate>
                    <div className="x-eyebrow">Criar conta</div>
                    <h2 className="x-auth-title">
                        Seja bem-<br /><em>vindo</em>.
                    </h2>
                    <p className="x-auth-sub">
                        Um minuto para criar sua conta e começar a organizar partidas.
                    </p>

                    <div className="x-auth-tabs">
                        <button type="button" onClick={() => nav("/login")}>Entrar</button>
                        <button type="button" className="active">Criar conta</button>
                    </div>

                    <div className="x-auth-fields">
                        <div className="x-field">
                            <label>Nome completo</label>
                            <input
                                className={`x-input ${errors.nome ? "has-err" : ""}`}
                                placeholder="Seu nome"
                                autoComplete="name"
                                value={nome}
                                onChange={(e) => {
                                    setNome(e.target.value);
                                    if (errors.nome) setErrors((p) => ({ ...p, nome: undefined }));
                                }}
                            />
                            {errors.nome && <div className="x-field-error">⚠ {errors.nome}</div>}
                        </div>

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
                            <label>CEP</label>
                            <input
                                className={`x-input ${errors.cep ? "has-err" : ""}`}
                                placeholder="00000-000"
                                inputMode="numeric"
                                autoComplete="postal-code"
                                value={maskCEP(cep)}
                                onChange={(e) => {
                                    setCep(e.target.value.replace(/\D/g, ""));
                                    if (errors.cep) setErrors((p) => ({ ...p, cep: undefined }));
                                }}
                            />
                            {errors.cep && <div className="x-field-error">⚠ {errors.cep}</div>}
                        </div>

                        <div className="x-field">
                            <label>Senha</label>
                            <div className="x-input-wrap">
                                <input
                                    className={`x-input ${errors.senha ? "has-err" : ""}`}
                                    type={showPass ? "text" : "password"}
                                    placeholder="No mínimo 8 caracteres"
                                    autoComplete="new-password"
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
                                >
                                    <EyeIcon />
                                </button>
                            </div>
                            {errors.senha && <div className="x-field-error">⚠ {errors.senha}</div>}
                        </div>

                        <div className="x-field">
                            <label>Qual nota você avalia seu Vôlei (0-10)</label>
                            <select
                                className={`x-select ${errors.notaVolei ? "has-err" : ""}`}
                                value={notaVolei}
                                onChange={(e) => {
                                    setNotaVolei(e.target.value);
                                    if (errors.notaVolei) setErrors((p) => ({ ...p, notaVolei: undefined }));
                                }}
                            >
                                <option value="">—</option>
                                {NOTA_OPTIONS.map((n) => <option key={n} value={String(n)}>{n}</option>)}
                            </select>
                            {errors.notaVolei && <div className="x-field-error">⚠ {errors.notaVolei}</div>}
                        </div>

                        <div className="x-field">
                            <label>Qual nota você avalia seu Futevôlei (0-10)</label>
                            <select
                                className={`x-select ${errors.notaFutevolei ? "has-err" : ""}`}
                                value={notaFutevolei}
                                onChange={(e) => {
                                    setNotaFutevolei(e.target.value);
                                    if (errors.notaFutevolei) setErrors((p) => ({ ...p, notaFutevolei: undefined }));
                                }}
                            >
                                <option value="">—</option>
                                {NOTA_OPTIONS.map((n) => <option key={n} value={String(n)}>{n}</option>)}
                            </select>
                            {errors.notaFutevolei && <div className="x-field-error">⚠ {errors.notaFutevolei}</div>}
                        </div>
                    </div>

                    <div className="x-auth-help">
                        Ao criar conta você concorda com os termos de uso.
                    </div>

                    <button type="submit" className="x-btn block lg" disabled={loading}>
                        {loading ? "Criando..." : "Criar minha conta"} <span className="x-btn-arr">→</span>
                    </button>

                    <button type="button" className="x-auth-alt" onClick={() => nav("/login")}>
                        Já tem conta? <u>Fazer login</u>
                    </button>

                    <div className="x-auth-foot">v4.1.23 · #2</div>
                </form>
            </section>

            {successOpen && (
                <div className="x-modal-overlay" onClick={() => setSuccessOpen(false)}>
                    <div className="x-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="x-eyebrow">Bem-vindo ao clube</div>
                        <h3 className="x-modal-title" style={{ marginTop: 12 }}>
                            Jogar o fut da semana<br />ficou <em>ainda</em> mais fácil.
                        </h3>
                        <ul className="x-modal-list">
                            <li>Crie partidas e equipes</li>
                            <li>Entre em partidas ou equipes disponíveis</li>
                            <li>Jogue como mensalista ou avulso</li>
                            <li>Avalie partidas, equipes e jogadores</li>
                        </ul>
                        <div className="x-modal-actions">
                            <button className="x-btn block lg" onClick={goToLogin}>
                                Entrar agora <span className="x-btn-arr">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
