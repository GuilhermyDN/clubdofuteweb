import { useState } from "react";
import { cadastrar } from "../services/auth";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const nav = useNavigate();

    const [successOpen, setSuccessOpen] = useState(false);
    const [nome, setNome] = useState("");
    const [telefone, setTelefone] = useState("");
    const [cep, setCep] = useState("");
    const [senha, setSenha] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleRegister() {
        if (!nome || !telefone || !cep || !senha) {
            alert("Preencha todos os campos");
            return;
        }

        if (senha.length < 8) {
            alert("Senha deve ter no mínimo 8 caracteres");
            return;
        }

        try {
            setLoading(true);

            const data = await cadastrar({
                nome,
                telefone,
                cep,
                senha,
            });

            console.log("CADASTRO OK:", data);

            setSuccessOpen(true);
        } catch (err: any) {
            console.error("Erro cadastro:", err);
            alert("Erro ao cadastrar");
        } finally {
            setLoading(false);
        }
    }

    function goToLogin() {
        setSuccessOpen(false);
        nav("/login");
    }

    return (
        <div className="screen">
            <div className="auth-card">

                {/* HEADER */}
                <div className="auth-header">
                    <div className="auth-icon">
                        <img src="/logo-mao.png" className="auth-logo" />
                    </div>
                    <div className="auth-title">Criar conta no ClubeDoFut</div>
                </div>

                {/* TABS */}
                <div className="tabs">
                    <div className="tab" onClick={() => nav("/login")}>Login</div>
                    <div className="tab active">Cadastro</div>
                </div>

                <div className="section-label">Seja bem-vindo!</div>

                {/* NOME */}
                <div className="field-wrap">
                    <div className="field-caption">Nome completo</div>
                    <input
                        className="field"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                    />
                </div>

                {/* TELEFONE */}
                <div className="field-wrap">
                    <div className="field-caption">Telefone</div>
                    <input
                        className="field"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                    />
                </div>

                {/* CEP */}
                <div className="field-wrap">
                    <div className="field-caption">CEP</div>
                    <input
                        className="field"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                    />
                </div>

                {/* SENHA */}
                <div className="field-wrap">
                    <div className="field-caption">Senha</div>
                    <input
                        className="field has-eye"
                        type={showPass ? "text" : "password"}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                    />

                    <button
                        type="button"
                        className="eye"
                        onClick={() => setShowPass((v) => !v)}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                                stroke="white"
                                strokeWidth="1.6"
                            />
                            <path
                                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                                stroke="white"
                                strokeWidth="1.6"
                            />
                        </svg>
                    </button>
                </div>

                <div className="helper">
                    Senha deve conter no mínimo 8 caracteres.
                </div>

                {/* BOTÃO */}
                <button className="btn" onClick={handleRegister} disabled={loading}>
                    <span className="btn-icon">
                        <svg
                            className="btn-icon-svg"
                            viewBox="0 0 27 27"
                            fill="none"
                        >
                            <path
                                d="M13.1912 26.3093V24.1168H24.1168V2.19244H13.1912V0H24.1168C24.7015 0 25.2131 0.219244 25.6515 0.657732C26.09 1.09622 26.3093 1.60779 26.3093 2.19244V24.1168C26.3093 24.7015 26.09 25.2131 25.6515 25.6515C25.2131 26.09 24.7015 26.3093 24.1168 26.3093H13.1912ZM11.1814 19.5493L9.61019 17.978L13.3373 14.2509H0V12.0584H13.2643L9.53711 8.33127L11.1084 6.76002L17.5395 13.1912L11.1814 19.5493Z"
                                fill="white"
                            />
                        </svg>
                    </span>
                    {loading ? "Criando..." : "Cadastrar"}
                </button>

                <div className="link" onClick={() => nav("/login")}>
                    Já tem conta? Fazer login
                </div>

                <div className="footer flex items-center gap-2">
                    <img src="/icon-bola.png" className="footer-icon" />
                    4.1.23#2
                </div>

            </div>
            {successOpen && (
                <div
                    className="successModalOverlay"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setSuccessOpen(false)}
                >
                    <div className="successModal" onClick={(e) => e.stopPropagation()}>
                        <div className="successBrand">
                            <img src="/icon-bola.png" className="successBrandIcon" alt="" />
                            <div className="successBrandName">ClubeDoFut</div>
                        </div>

                        <div className="successBallWrap" aria-hidden="true">
                            <img src="/icon-bola.png" className="successBall" alt="" />
                        </div>

                        <div className="successHeadline">
                            Jogar o Fut da semana <br />
                            ficou ainda mais fácil.
                        </div>

                        <ul className="successBullets">
                            <li>Crie partidas e equipes.</li>
                            <li>Entre em partidas ou equipes disponíveis.</li>
                            <li>
                                Jogue em partidas com outros. <br />
                                Entre em partidas (ou como mensalista).
                            </li>
                            <li>Avalie Partidas, Equipes e Jogadores.</li>
                            <li>E muito mais.</li>
                        </ul>

                        <div className="successBottom">
                            <div className="successBottomLeft" onClick={goToLogin}>Bora?</div>

                            <button className="successCta" onClick={goToLogin}>
                                Dale!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>


    );
}