import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export default function Modalidades() {
    const nav = useNavigate();

    return (
        <main className="x">
            <SiteHeader />

            <section className="x-hero">
                <div className="x-wide">
                    <div style={{ maxWidth: 860 }}>
                        <div className="x-eyebrow x-reveal">Modalidades</div>
                        <h1 className="x-h1 x-reveal x-d-1" style={{ marginTop: 20 }}>
                            Feito para a sua<br /><em>paixão</em>.
                        </h1>
                        <p className="x-lead x-reveal x-d-2" style={{ marginTop: 28, maxWidth: 640 }}>
                            Sua equipe merece uma gestão à altura da dedicação com a qual você encara o esporte.
                            Seja na quadra, na areia, ou no treino da semana.
                        </p>
                    </div>
                </div>
            </section>

            <section className="x-section compact">
                <div className="x-wide">
                    <div className="x-mods x-stagger">
                        <article className="x-mod big x-reveal">
                            <img src="/volei-praia.jpg" alt="Futevôlei" loading="lazy" />
                            <div className="x-mod-content">
                                <div className="x-mod-cat">Modalidade 01 · Areia</div>
                                <h3 className="x-mod-title">Futevôlei</h3>
                                <p className="x-mod-desc">
                                    Altinha, clínicas e rachões na praia. Da dupla casual ao campeonato sério —
                                    organize 2×2 ou 4×4 com nivelamento automático baseado em notas de 0 a 10.
                                    O jogo flui, a disputa aperta.
                                </p>
                            </div>
                        </article>

                        <article className="x-mod x-reveal">
                            <img src="/indoor.jpg" alt="Vôlei Indoor" loading="lazy" />
                            <div className="x-mod-content">
                                <div className="x-mod-cat">Modalidade 02 · Quadra</div>
                                <h3 className="x-mod-title">Vôlei Indoor</h3>
                                <p className="x-mod-desc">
                                    O tradicional jogo de quadra, do 6×6 clássico ao treino de fundamento.
                                </p>
                            </div>
                        </article>

                        <article className="x-mod x-reveal">
                            <img src="/brunobarros.avif" alt="Treinos" loading="lazy" />
                            <div className="x-mod-content">
                                <div className="x-mod-cat">Modalidade 03 · Evolução</div>
                                <h3 className="x-mod-title">Treinos</h3>
                                <p className="x-mod-desc">
                                    Treine, evolua e jogue com quem está no seu nível.
                                </p>
                            </div>
                        </article>
                    </div>

                    <div style={{ marginTop: 56, display: "flex", gap: 14, flexWrap: "wrap" }}>
                        <button className="x-btn lg" onClick={() => nav("/register")}>
                            Criar conta grátis <span className="x-btn-arr">→</span>
                        </button>
                        <button className="x-btn outline lg" onClick={() => nav("/como-funciona")}>
                            Ver como funciona
                        </button>
                    </div>
                </div>
            </section>

            <SiteFooter />
        </main>
    );
}
