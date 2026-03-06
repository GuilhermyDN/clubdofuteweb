import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth"; // <-- ADICIONE ISSO

function EyeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                stroke="rgba(255,255,255,.70)"
                strokeWidth="1.6"
            />
            <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                stroke="rgba(255,255,255,.70)"
                strokeWidth="1.6"
            />
        </svg>
    );
}

function maskTelefone(v: string) {
    const nums = v.replace(/\D/g, "").slice(0, 11);

    if (nums.length <= 2) return nums;
    if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    if (nums.length <= 10) {
        return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
    }

    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

export default function Login() {
    const nav = useNavigate();

    const [telefone, setTelefone] = useState("");
    const [senha, setSenha] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        const tel = telefone.trim();

        if (!tel || !senha) {
            alert("Preencha telefone e senha");
            return;
        }

        if (senha.length < 8) {
            alert("Senha deve ter no mínimo 8 caracteres");
            return;
        }

        try {
            setLoading(true);

            const data = await login({
                telefone: tel,
                senha,
            });

            console.log("LOGIN OK:", data);
            // alert("Login OK (veja o console).");

            const token = data?.token || data?.accessToken || data?.jwt;
            if (token) localStorage.setItem("cdf_token", token);

            nav("/eu");
            return;

            // depois que você me mandar o response, eu coloco:
            // localStorage token + redirect
            // nav("/home");
        } catch (err: any) {
            console.error("Erro login:", err);

            const status = err?.response?.status;
            const data = err?.response?.data;

            if (!status) {
                alert("Falha na rede (provável CORS/proxy ou backend fora). Veja Network.");
                return;
            }

            alert(`Erro no login (HTTP ${status}): ${JSON.stringify(data)}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="screen">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon">
                        <img src="/logo-mao.png" alt="logo" className="auth-logo" />
                    </div>
                    <div className="auth-title">Bem vindo, ao ClubeDoFut</div>
                </div>

                <div className="tabs">
                    <div className="tab active">Login</div>
                    <div className="tab" onClick={() => nav("/register")}>
                        Cadastro
                    </div>
                </div>

                <div className="section-label">Ja é dos nossos?</div>

                {/* Telefone */}
                <div className="field-wrap">
                    <div className="field-caption">Telefone</div>
                    <input
                        className="field"
                        value={maskTelefone(telefone)}
                        onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            setTelefone(raw);
                        }}
                    />
                </div>

                {/* Senha */}
                <div className="field-wrap">
                    <div className="field-caption">Senha</div>
                    <input
                        className="field has-eye"   // <-- IMPORTANTE (padding-right pro olho)
                        type={showPass ? "text" : "password"}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                    />
                    <button
                        type="button"
                        className="eye"
                        onClick={() => setShowPass((v) => !v)}
                        aria-label="Mostrar/ocultar senha"
                    >
                        <EyeIcon />
                    </button>
                </div>

                <div className="helper">Senhas deveriam conter no mínimo 8 caracteres.</div>

                <button className="btn" type="button" onClick={handleLogin} disabled={loading}>
                    <span className="btn-icon" aria-hidden="true">
                        <svg className="btn-icon-svg" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M13.1912 26.3093V24.1168H24.1168V2.19244H13.1912V0H24.1168C24.7015 0 25.2131 0.219244 25.6515 0.657732C26.09 1.09622 26.3093 1.60779 26.3093 2.19244V24.1168C26.3093 24.7015 26.09 25.2131 25.6515 25.6515C25.2131 26.09 24.7015 26.3093 24.1168 26.3093H13.1912ZM11.1814 19.5493L9.61019 17.978L13.3373 14.2509H0V12.0584H13.2643L9.53711 8.33127L11.1084 6.76002L17.5395 13.1912L11.1814 19.5493Z"
                                fill="white"
                            />
                        </svg>
                    </span>
                    {loading ? "Entrando..." : "Login"}
                </button>

                <div className="link">Esqueci minha senha</div>

                <div className="footer flex items-center gap-2">
                    <img src="/icon-bola.png" className="footer-icon" />
                    4.1.23#2
                </div>
            </div>
        </div>
    );
}