import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import TiltCard from "../components/TiltCard";
import CountUp from "../components/CountUp";

/* ── Icons ─────────────────────────────────────────────────────── */
const Ic = {
    net: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M3 18h18M3 6v12M21 6v12M8 6v12M13 6v12M18 6v12M3 10h18M3 14h18" />
        </svg>
    ),
    users: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    chart: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 15l4-4 3 3 5-6" />
        </svg>
    ),
    balance: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M4 21h16" />
            <path d="M6 9l-3 6h6l-3-6ZM18 9l-3 6h6l-3-6Z" />
        </svg>
    ),
    bell: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    ),
    link: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    ),
    ball: () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        </svg>
    ),
};

const FEATURES = [
    { icon: <Ic.net />, title: "Equipes fixas ou avulsas", desc: "Monte grupos fechados com senha ou abra a quadra para quem chegar. Controle total de quem entra." },
    { icon: <Ic.users />, title: "Controle de presença", desc: "Chega de contar nomes no chat. Veja confirmados, cancelados e vagas em tempo real." },
    { icon: <Ic.chart />, title: "Avaliação pós-jogo", desc: "Os jogadores avaliam o equilíbrio dos times e o sistema aprende para afinar os próximos sorteios." },
    { icon: <Ic.balance />, title: "Times nivelados", desc: "Algoritmo balanceia os times pelas notas individuais (0–10). Acabou o massacre." },
    { icon: <Ic.bell />, title: "Lista de espera", desc: "Partida lotou? Lista de espera preenche vagas automaticamente quando alguém cancela." },
    { icon: <Ic.link />, title: "Convite por link", desc: "Compartilhe no WhatsApp. O jogador clica, faz login rápido e confirma em segundos." },
];

const ATHLETES = [
    { img: "/volei-praia.jpg", name: "Bruno Schmidt", tag: "Futevôlei · Areia", nota: "9.2", partidas: 128 },
    { img: "/indoor.jpg", name: "Camila Souza", tag: "Vôlei Indoor · 6×6", nota: "8.8", partidas: 94 },
    { img: "/acao.webp", name: "Rafael Moura", tag: "Futevôlei · 2×2", nota: "9.5", partidas: 212 },
    { img: "/brunobarros.avif", name: "Thiago Lima", tag: "Treinador · Praia", nota: "9.0", partidas: 76 },
];

export default function Home() {
    const nav = useNavigate();

    return (
        <main className="x">
            <SiteHeader />

            {/* ── HERO ─────────────────────────────────────────────── */}
            <section className="x-hero">
                <div className="x-wide" style={{ position: "relative" }}>
                    {/* decorative floating 3D ball (paused off-screen via RevealObserver) */}
                    <div className="x-ball3d x-vis-toggle" style={{ top: "8%", right: "40%" }}>
                        <img src="/icon-bola.png" alt="" />
                    </div>

                    <div className="x-hero-grid">
                        <div className="x-hero-left">
                            <div className="x-eyebrow x-reveal">Organize · Nivele · Jogue</div>

                            <h1 className="x-h1 x-reveal x-d-1" style={{ marginTop: 20 }}>
                                Sua única preocupação é passar a bola da <em>Rede</em>.
                            </h1>

                            <p className="x-lead x-reveal x-d-2" style={{ marginTop: 24, maxWidth: 560 }}>
                                A plataforma definitiva para organizar listas de <strong>vôlei</strong> e{" "}
                                <strong>futevôlei</strong>. Esqueça o caos do WhatsApp — controle presenças,
                                limites de vagas e times equilibrados em segundos.
                            </p>

                            <div className="x-hero-cta-row x-reveal x-d-3">
                                <button className="x-btn lg" onClick={() => nav("/register")}>
                                    Começar grátis <span className="x-btn-arr">→</span>
                                </button>
                                <button className="x-btn outline lg" onClick={() => nav("/como-funciona")}>
                                    Como funciona
                                </button>
                            </div>

                            <div className="x-hero-meta x-reveal x-d-4">
                                <div className="x-hero-meta-item">
                                    <div className="x-hero-meta-val">
                                        <CountUp to={100} suffix="%" />
                                    </div>
                                    <div className="x-hero-meta-lbl">Grátis, sempre será</div>
                                </div>
                                <div className="x-hero-meta-item">
                                    <div className="x-hero-meta-val">0<em>–</em>10</div>
                                    <div className="x-hero-meta-lbl">Notas por jogador</div>
                                </div>
                                <div className="x-hero-meta-item">
                                    <div className="x-hero-meta-val">6<em>×</em>6</div>
                                    <div className="x-hero-meta-lbl">4×4, 2×2, como quiser</div>
                                </div>
                            </div>
                        </div>

                        <div className="x-hero-visual-wrap x-reveal right x-d-2">
                            <div className="x-hero-visual">
                                <img src="/volei-praia.jpg" alt="Futevôlei" loading="eager" />
                                <div className="x-hero-visual-content">
                                    <div className="x-hero-visual-tag">
                                        <span className="d" /> Ao vivo agora
                                    </div>
                                    <h3 className="x-hero-visual-title">Rachão de Futevôlei</h3>
                                    <div className="x-hero-visual-sub">Hoje · 19:30 · Praia do Canto</div>
                                </div>
                            </div>

                            <div className="x-hero-stat">
                                <div className="x-hero-stat-lbl">Confirmados</div>
                                <div className="x-hero-stat-val">
                                    <CountUp to={10} /><em>/12</em>
                                </div>
                                <div className="x-hero-stat-row">
                                    <div className="x-hero-stat-av" />
                                    <div className="x-hero-stat-av g2" />
                                    <div className="x-hero-stat-av g3" />
                                    <div className="x-hero-stat-av g4" />
                                    <div className="x-hero-stat-av" />
                                    <span className="x-hero-stat-more">+5 confirmados</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── MARQUEE TICKER ──────────────────────────────────── */}
            <div className="x-marquee x-vis-toggle" aria-hidden>
                <div className="x-marquee-track">
                    {[...Array(2)].map((_, k) => (
                        <span key={k}>
                            Vôlei
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                            </svg>
                            <em>Futevôlei</em>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                            </svg>
                            Times Nivelados
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                            </svg>
                            <em>100% Grátis</em>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                            </svg>
                            Sem Furos
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                            </svg>
                            <em>Altinha</em>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                            </svg>
                        </span>
                    ))}
                </div>
            </div>

            {/* ── FEATURES ────────────────────────────────────────── */}
            <section className="x-section">
                <div className="x-wide">
                    <div className="x-section-head">
                        <div>
                            <div className="x-eyebrow x-reveal">Funcionalidades</div>
                            <h2 className="x-h2 x-reveal x-d-1" style={{ marginTop: 16 }}>
                                Tudo que você precisa para <em>organizar</em>.
                            </h2>
                        </div>
                        <p className="x-lead x-reveal x-d-2">
                            Do convite no WhatsApp ao set point final, sem sair da plataforma. Sem planilha, sem
                            caos, sem discussão.
                        </p>
                    </div>

                    <div className="x-feat-grid x-stagger">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="x-feat x-reveal">
                                <div className="x-feat-icon">{f.icon}</div>
                                <h3 className="x-feat-title">{f.title}</h3>
                                <p className="x-feat-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ATLETAS (3D tilt cards) ─────────────────────────── */}
            <section className="x-section alt">
                <div className="x-wide">
                    <div className="x-section-head">
                        <div>
                            <div className="x-eyebrow x-reveal">Atletas do Clube</div>
                            <h2 className="x-h2 x-reveal x-d-1" style={{ marginTop: 16 }}>
                                Passe o mouse, <em>sinta o jogo</em>.
                            </h2>
                        </div>
                        <p className="x-lead x-reveal x-d-2">
                            Alguns dos atletas que já confiam no ClubeDoFut para organizar seus rachões.
                        </p>
                    </div>

                    <div className="x-athletes x-stagger">
                        {ATHLETES.map((a) => (
                            <TiltCard
                                key={a.name}
                                className="x-athlete-card x-reveal scale"
                                strength={14}
                            >
                                <img src={a.img} alt={a.name} loading="lazy" />
                                <div className="x-athlete-meta x-tilt-inner">
                                    <div className="x-athlete-tag">{a.tag}</div>
                                    <h3 className="x-athlete-name">{a.name}</h3>
                                    <div className="x-athlete-sub">Membro desde 2024</div>
                                    <div className="x-athlete-stats">
                                        <div className="x-athlete-stat">
                                            <span className="x-athlete-stat-val">{a.nota}</span>
                                            <span className="x-athlete-stat-lbl">Nota</span>
                                        </div>
                                        <div className="x-athlete-stat">
                                            <span className="x-athlete-stat-val">{a.partidas}</span>
                                            <span className="x-athlete-stat-lbl">Partidas</span>
                                        </div>
                                    </div>
                                </div>
                            </TiltCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── MODALITIES ──────────────────────────────────────── */}
            <section className="x-section">
                <div className="x-wide">
                    <div className="x-section-head">
                        <div>
                            <div className="x-eyebrow x-reveal">Modalidades</div>
                            <h2 className="x-h2 x-reveal x-d-1" style={{ marginTop: 16 }}>
                                Feito para a sua <em>paixão</em>.
                            </h2>
                        </div>
                        <p className="x-lead x-reveal x-d-2">
                            Sua equipe merece uma gestão à altura da dedicação com a qual você encara o esporte.
                        </p>
                    </div>

                    <div className="x-mods x-stagger">
                        <article className="x-mod big x-reveal">
                            <img src="/volei-praia.jpg" alt="Futevôlei" loading="lazy" />
                            <div className="x-mod-content">
                                <div className="x-mod-cat">Modalidade 01 · Areia</div>
                                <h3 className="x-mod-title">Futevôlei</h3>
                                <p className="x-mod-desc">
                                    Altinha, clínicas e rachões na praia. Da dupla casual ao campeonato sério —
                                    organize 2×2 ou 4×4 com nivelamento automático.
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
                </div>
            </section>

            {/* ── STEPS ───────────────────────────────────────────── */}
            <section className="x-section alt">
                <div className="x-wide">
                    <div className="x-section-head">
                        <div>
                            <div className="x-eyebrow x-reveal">Como funciona</div>
                            <h2 className="x-h2 x-reveal x-d-1" style={{ marginTop: 16 }}>
                                Do convite ao <em>set point</em> em 3 passos.
                            </h2>
                        </div>
                        <p className="x-lead x-reveal x-d-2">
                            Simples, direto, sem complicação. Menos de 1 minuto para criar uma partida.
                        </p>
                    </div>

                    <div className="x-steps x-stagger">
                        <div className="x-step x-reveal">
                            <div className="x-step-num">01</div>
                            <h3 className="x-step-title">Crie a partida</h3>
                            <p className="x-step-desc">
                                Defina o limite de jogadores, se aceita avulsos, a data/hora e o local.
                                Tudo pronto em menos de 1 minuto.
                            </p>
                        </div>
                        <div className="x-step x-reveal">
                            <div className="x-step-num">02</div>
                            <h3 className="x-step-title">Compartilhe o link</h3>
                            <p className="x-step-desc">
                                Mande direto no WhatsApp. Cada jogador clica, faz login rápido e
                                confirma a presença em segundos.
                            </p>
                        </div>
                        <div className="x-step x-reveal">
                            <div className="x-step-num">03</div>
                            <h3 className="x-step-title">Sorteie os times</h3>
                            <p className="x-step-desc">
                                Com a lista fechada, um clique sorteia equipes equilibradas pelas notas
                                individuais. Jogue sem discussão.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────────────────── */}
            <section className="x-cta-final">
                <div className="x-container">
                    <div className="x-cta-box x-reveal scale">
                        <div className="x-eyebrow" style={{ justifyContent: "center" }}>Grátis para sempre</div>
                        <h2 className="x-h2" style={{ marginTop: 20 }}>
                            Sua rede está pronta<br />para subir de <em>nível</em>?
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
