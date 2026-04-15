import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const Ic = {
    net: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 18h18M3 6v12M21 6v12M8 6v12M13 6v12M18 6v12M3 10h18M3 14h18" /></svg>),
    users: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
    chart: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>),
    balance: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M4 21h16" /><path d="M6 9l-3 6h6l-3-6ZM18 9l-3 6h6l-3-6Z" /></svg>),
    bell: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>),
    link: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>),
};

const BENEFITS = [
    { icon: <Ic.net />, title: "Gestão de equipes", desc: "Crie grupos fechados com senha ou mantenha a quadra aberta para avulsos. Você decide quem entra." },
    { icon: <Ic.users />, title: "Controle de presença", desc: "Veja confirmados, cancelados e vagas em tempo real. Sem contar nomes no chat." },
    { icon: <Ic.chart />, title: "Avaliação pós-jogo", desc: "Os membros avaliam o equilíbrio dos times e o sistema aprende para os próximos sorteios." },
    { icon: <Ic.balance />, title: "Times nivelados", desc: "Algoritmo balanceia pelas notas individuais (0–10). Jogo justo, partida boa." },
    { icon: <Ic.bell />, title: "Lista de espera", desc: "Ninguém fica de fora na mão. A lista preenche vagas automaticamente quando alguém cancela." },
    { icon: <Ic.link />, title: "Convite por link", desc: "Compartilhe direto no WhatsApp. Login rápido e confirmação em segundos." },
];

export default function Beneficios() {
    const nav = useNavigate();

    return (
        <main className="x">
            <SiteHeader />

            <section className="x-hero">
                <div className="x-wide">
                    <div style={{ maxWidth: 860 }}>
                        <div className="x-eyebrow x-reveal">Benefícios</div>
                        <h1 className="x-h1 x-reveal x-d-1" style={{ marginTop: 20 }}>
                            O fim da panela<br />
                            <em>desequilibrada</em>.
                        </h1>
                        <p className="x-lead x-reveal x-d-2" style={{ marginTop: 28, maxWidth: 640 }}>
                            Sabemos como é frustrante quando um time esmaga o outro jogo atrás de jogo.
                            Nossa plataforma foi desenhada para a realidade das quadras e da areia —
                            não para planilhas de escritório.
                        </p>
                        <div className="x-hero-cta-row x-reveal x-d-3">
                            <button className="x-btn lg" onClick={() => nav("/register")}>
                                Criar conta grátis <span className="x-btn-arr">→</span>
                            </button>
                            <button className="x-btn outline lg" onClick={() => nav("/como-funciona")}>
                                Ver como funciona
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="x-section alt compact">
                <div className="x-wide">
                    <div className="x-section-head">
                        <div>
                            <div className="x-eyebrow x-reveal">Pilares</div>
                            <h2 className="x-h2 x-reveal x-d-1" style={{ marginTop: 16 }}>
                                Seis motivos para levar<br />o esporte <em>a sério</em>.
                            </h2>
                        </div>
                    </div>

                    <div className="x-feat-grid x-stagger">
                        {BENEFITS.map((b) => (
                            <div key={b.title} className="x-feat x-reveal">
                                <div className="x-feat-icon">{b.icon}</div>
                                <h3 className="x-feat-title">{b.title}</h3>
                                <p className="x-feat-desc">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="x-cta-final">
                <div className="x-container">
                    <div className="x-cta-box x-reveal scale">
                        <h2 className="x-h2">
                            Pronto para <em>começar</em>?
                        </h2>
                        <p className="x-lead">
                            Crie sua conta gratuita e organize seu primeiro rachão ainda hoje.
                        </p>
                        <div className="x-cta-btns">
                            <button className="x-btn lg" onClick={() => nav("/register")}>
                                Criar conta grátis <span className="x-btn-arr">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <SiteFooter />
        </main>
    );
}
