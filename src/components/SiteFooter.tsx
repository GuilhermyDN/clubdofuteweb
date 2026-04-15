import { useNavigate } from "react-router-dom";

export default function SiteFooter() {
    const nav = useNavigate();
    const year = new Date().getFullYear();

    return (
        <footer className="x-foot">
            <div className="x-wide">
                <div className="x-foot-top">
                    <div className="x-foot-brand-col">
                        <button className="x-brand" onClick={() => nav("/")}>
                            <span className="x-brand-mark">
                                <img src="/icon-bola.png" alt="" />
                            </span>
                            <span className="x-brand-name">ClubeDoFut</span>
                        </button>
                        <p className="x-foot-about">
                            A plataforma para organizar rachões de vôlei e futevôlei.
                            Controle de presença, sorteio com nivelamento e avaliação pós-jogo.
                        </p>
                        <button className="x-btn" onClick={() => nav("/register")}>
                            Criar conta grátis <span className="x-btn-arr">→</span>
                        </button>
                    </div>

                    <div className="x-foot-cols">
                        <div>
                            <div className="x-foot-col-title">Plataforma</div>
                            <button className="x-foot-link" onClick={() => nav("/register")}>Criar conta</button>
                            <button className="x-foot-link" onClick={() => nav("/login")}>Entrar</button>
                            <button className="x-foot-link" onClick={() => nav("/como-funciona")}>Como funciona</button>
                        </div>
                        <div>
                            <div className="x-foot-col-title">Descobrir</div>
                            <button className="x-foot-link" onClick={() => nav("/")}>Início</button>
                            <button className="x-foot-link" onClick={() => nav("/beneficios")}>Benefícios</button>
                            <button className="x-foot-link" onClick={() => nav("/modalidades")}>Modalidades</button>
                        </div>
                        <div>
                            <div className="x-foot-col-title">Modalidades</div>
                            <button className="x-foot-link" onClick={() => nav("/modalidades")}>Vôlei Indoor</button>
                            <button className="x-foot-link" onClick={() => nav("/modalidades")}>Futevôlei</button>
                            <button className="x-foot-link" onClick={() => nav("/modalidades")}>Treinos</button>
                        </div>
                    </div>
                </div>

                <div className="x-foot-bot">
                    <span>© {year} ClubeDoFut · Feito para quem vive o esporte</span>
                    <span>v4.1.23</span>
                </div>
            </div>
        </footer>
    );
}
