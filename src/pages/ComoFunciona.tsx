import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export default function ComoFunciona() {
    const nav = useNavigate();

    return (
        <main className="x">
            <SiteHeader />

            <section className="x-hero">
                <div className="x-wide">
                    <div style={{ maxWidth: 860 }}>
                        <div className="x-eyebrow x-reveal">Como funciona</div>
                        <h1 className="x-h1 x-reveal x-d-1" style={{ marginTop: 20 }}>
                            Do convite ao<br /><em>set point</em> em 3 passos.
                        </h1>
                        <p className="x-lead x-reveal x-d-2" style={{ marginTop: 28, maxWidth: 640 }}>
                            Simples, direto, sem complicação. Menos de 1 minuto para criar uma partida
                            e mandar no grupo.
                        </p>
                    </div>
                </div>
            </section>

            <section className="x-section alt compact">
                <div className="x-wide">
                    <div className="x-steps x-stagger">
                        <div className="x-step x-reveal">
                            <div className="x-step-num">01</div>
                            <h3 className="x-step-title">Crie a partida</h3>
                            <p className="x-step-desc">
                                Defina o limite de jogadores, se aceita avulsos, a data/hora e o local.
                                Tudo pronto em menos de 1 minuto — do celular ou do computador.
                            </p>
                        </div>
                        <div className="x-step x-reveal">
                            <div className="x-step-num">02</div>
                            <h3 className="x-step-title">Compartilhe o link</h3>
                            <p className="x-step-desc">
                                Mande direto no grupo do WhatsApp. Cada jogador clica, faz um login
                                rápido e confirma a presença em segundos — sem contar nomes no chat.
                            </p>
                        </div>
                        <div className="x-step x-reveal">
                            <div className="x-step-num">03</div>
                            <h3 className="x-step-title">Sorteie os times</h3>
                            <p className="x-step-desc">
                                Com a lista fechada, um clique sorteia equipes equilibradas pelas notas
                                individuais. Jogue sem discussão. Avalie depois. Repita.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="x-cta-final">
                <div className="x-container">
                    <div className="x-cta-box x-reveal scale">
                        <div className="x-eyebrow" style={{ justifyContent: "center" }}>Grátis para sempre</div>
                        <h2 className="x-h2" style={{ marginTop: 20 }}>
                            Pronto para montar<br />seu primeiro <em>rachão</em>?
                        </h2>
                        <p className="x-lead">
                            Junte-se a organizadores e atletas que levam o esporte a sério.
                        </p>
                        <div className="x-cta-btns">
                            <button className="x-btn lg" onClick={() => nav("/register")}>
                                Criar conta grátis <span className="x-btn-arr">→</span>
                            </button>
                            <button className="x-btn outline lg" onClick={() => nav("/login")}>
                                Já tenho conta
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <SiteFooter />
        </main>
    );
}
