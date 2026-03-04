import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp2-accent2">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const NetIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v16M20 4v16M4 8h16M4 12h16M4 16h16M8 4v16M12 4v16M16 4v16" opacity="0.8" />
    </svg>
);

const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

const ChartIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10"></path>
        <path d="M18 20V4"></path>
        <path d="M6 20v-4"></path>
    </svg>
);

export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();

    // Links agora apontam para rotas ao invés de IDs de seção
    const links = useMemo(
        () => [
            { path: "/", label: "Início" },
            { path: "/beneficios", label: "Benefícios" },
            { path: "/modalidades", label: "Modalidades" },
            { path: "/como-funciona", label: "Como Funciona" },
        ],
        []
    );

    return (
        <main className="lp2">
            {/* NAVEGAÇÃO */}
            <header className="lp2-nav">
                <div className="lp2-nav-inner">
                    <button className="lp2-brand" onClick={() => navigate("/")} aria-label="Ir para início">
                        <img src="/icon-bola.png" className="lp2-brand-logo" alt="ClubeDoFut" />
                        <span className="lp2-brand-name">ClubeDoFut</span>
                    </button>

                    <nav className="lp2-links" aria-label="Navegação">
                        {links.map((l) => (
                            <button
                                key={l.path}
                                // Marca como ativo comparando a rota atual com o path do link
                                className={`lp2-link ${location.pathname === l.path ? "active" : ""}`}
                                onClick={() => navigate(l.path)}
                            >
                                {l.label}
                            </button>
                        ))}
                    </nav>

                    <div className="lp2-actions">
                        <button className="lp2-btn ghost" onClick={() => navigate("/login")}>
                            Entrar
                        </button>
                        <button className="lp2-btn" onClick={() => navigate("/register")}>
                            Criar Conta
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section id="inicio" className="lp2-hero">
                <div className="lp2-container lp2-hero-grid">
                    <div className="lp2-hero-left">
                        <span className="lp2-pill" style={{ borderColor: 'rgba(254, 240, 138, 0.3)', color: '#fef08a' }}>
                            A revolução nas quadras e na areia
                        </span>

                        <h1 className="lp2-h1">
                            Sua única preocupação é <br />
                            passar a bola da <span className="lp2-accent">Rede</span>.
                        </h1>

                        <p className="lp2-sub">
                            A plataforma definitiva para organizar suas listas de
                            <strong className="text-white"> Vôlei </strong> e
                            <strong className="text-white"> Futevôlei</strong>.
                            Esqueça o caos no WhatsApp: controle presenças, limite de vagas e gere times perfeitamente equilibrados em segundos.
                        </p>

                        <div className="lp2-cta">
                            <button className="lp2-btn big" onClick={() => navigate("/register")}>
                                Começar Gratuitamente
                            </button>
                            <button className="lp2-btn big ghost" onClick={() => navigate("/como-funciona")}>
                                Entenda a Dinâmica
                            </button>
                        </div>

                        <div className="lp2-kpis">
                            <div className="lp2-kpi">
                                <div className="lp2-kpi-num">Nivelamento</div>
                                <div className="lp2-kpi-label">Times com base em notas</div>
                            </div>
                            <div className="lp2-kpi">
                                <div className="lp2-kpi-num">Sem furos</div>
                                <div className="lp2-kpi-label">Lista de espera automática</div>
                            </div>
                        </div>
                    </div>

                    <div className="lp2-hero-right">
                        {/* MOSAICO DE IMAGENS */}
                        <div className="lp2-mosaic" aria-hidden="true">
                            <img
                                className="lp2-photo a"
                                src="/volei.jpg"
                                alt="Vôlei de Quadra"
                                loading="lazy"
                            />
                            <img
                                className="lp2-photo b"
                                src="/volei-praia.jpg"
                                alt="Futevôlei na Areia"
                                loading="lazy"
                            />
                            <img
                                className="lp2-photo c"
                                src="/acao.webp"
                                alt="Ação no Vôlei"
                                loading="lazy"
                            />
                            <div className="lp2-glow" />
                        </div>

                        {/* WIDGET PREVIEW */}
                        <div className="lp2-preview">
                            <div className="lp2-preview-top">
                                <div className="lp2-dot" />
                                <div className="lp2-dot" />
                                <div className="lp2-dot" />
                                <span className="lp2-preview-title">Treino Aberto • Hoje 19:30</span>
                            </div>

                            <div className="lp2-preview-body">
                                <div className="lp2-chiprow">
                                    <span className="lp2-chip">Futevôlei</span>
                                    <span className="lp2-chip">2x2</span>
                                    <span className="lp2-chip ok">Vagas: 2/12</span>
                                </div>

                                <div className="lp2-line" />
                                <div className="lp2-line short" />

                                <div className="lp2-people">
                                    {["G", "H", "M", "R", "B", "D"].map((x) => (
                                        <div key={x} className="lp2-avatar" style={{ borderColor: 'rgba(254, 240, 138, 0.4)' }}>
                                            {x}
                                        </div>
                                    ))}
                                    <span className="lp2-people-text">+4 confirmados</span>
                                </div>

                                <button className="lp2-miniBtn" onClick={() => navigate("/register")}>
                                    Confirmar Presença
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* BENEFÍCIOS */}
            <section id="sobre" className="lp2-section">
                <div className="lp2-container lp2-split">
                    <div>
                        <h2 className="lp2-h2">O fim da "panela" desequilibrada.</h2>
                        <p className="lp2-p">
                            Sabemos o quanto é frustrante organizar um jogo onde um time é muito mais forte que o outro.
                            Nossa plataforma foi desenhada para a realidade das quadras tradicionais e da areia.
                        </p>

                        <div className="lp2-bullets">
                            <div className="lp2-bullet">
                                <div className="lp2-check" style={{ display: 'grid', placeItems: 'center' }}>
                                    <CheckIcon />
                                </div>
                                <span>Algoritmo de nivelamento baseado em notas (0 a 10)</span>
                            </div>
                            <div className="lp2-bullet">
                                <div className="lp2-check" style={{ display: 'grid', placeItems: 'center' }}>
                                    <CheckIcon />
                                </div>
                                <span>Controle exato de limite de participantes (6x6, 4x4, 2x2)</span>
                            </div>
                            <div className="lp2-bullet">
                                <div className="lp2-check" style={{ display: 'grid', placeItems: 'center' }}>
                                    <CheckIcon />
                                </div>
                                <span>Sistema de convite rápido via Link ou QR Code</span>
                            </div>
                        </div>
                    </div>

                    <div className="lp2-cardStack">
                        <div className="lp2-card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                            <div style={{ color: '#fef08a', marginTop: '4px' }}><NetIcon /></div>
                            <div>
                                <div className="lp2-cardTitle">Gestão de Equipes Fixas</div>
                                <div className="lp2-cardText">Crie grupos fechados com senha ou mantenha sua quadra aberta para avulsos.</div>
                            </div>
                        </div>
                        <div className="lp2-card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                            <div style={{ color: '#a7f3d0', marginTop: '4px' }}><UsersIcon /></div>
                            <div>
                                <div className="lp2-cardTitle">Controle de Presença</div>
                                <div className="lp2-cardText">Chega de contar nomes no chat. Saiba exatamente quem confirmou e quem cancelou.</div>
                            </div>
                        </div>
                        <div className="lp2-card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                            <div style={{ color: '#93c5fd', marginTop: '4px' }}><ChartIcon /></div>
                            <div>
                                <div className="lp2-cardTitle">Avaliação Pós-Jogo</div>
                                <div className="lp2-cardText">Os membros avaliam o equilíbrio dos times para melhorar os próximos sorteios.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MODALIDADES (GALERIA) */}
            <section id="modalidades" className="lp2-section alt">
                <div className="lp2-container">
                    <h2 className="lp2-h2">Feito para a sua paixão</h2>
                    <p className="lp2-p">Sua equipe merece uma gestão à altura da sua dedicação ao esporte.</p>

                    <div className="lp2-gallery">
                        <article className="lp2-gItem">
                            <img className="lp2-gImg" src="/indoor.jpg" alt="Vôlei de Quadra" loading="lazy" />
                            <div className="lp2-gOverlay">
                                <div className="lp2-gTitle">Vôlei Indoor</div>
                                <div className="lp2-gSub">O tradicional jogo de quadra</div>
                            </div>
                        </article>
                        <article className="lp2-gItem">
                            <img className="lp2-gImg" src="/volei-praia.jpg" alt="Futevôlei" loading="lazy" />
                            <div className="lp2-gOverlay">
                                <div className="lp2-gTitle">Futevôlei</div>
                                <div className="lp2-gSub">Altinha, clínicas e rachões</div>
                            </div>
                        </article>
                        <article className="lp2-gItem">
                            <img className="lp2-gImg" src="/brunobarros.avif" alt="Treinos e Torneios" loading="lazy" />
                            <div className="lp2-gOverlay">
                                <div className="lp2-gTitle">Treinos</div>
                                <div className="lp2-gSub">Treine e divirta-se</div>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            {/* COMO FUNCIONA */}
            <section id="comoFunciona" className="lp2-section">
                <div className="lp2-container">
                    <h2 className="lp2-h2">Do convite ao set point em 3 passos</h2>

                    <div className="lp2-steps">
                        <div className="lp2-step">
                            <div className="lp2-stepN" style={{ color: '#fef08a', borderColor: 'rgba(254, 240, 138, 0.3)' }}>01</div>
                            <div className="lp2-stepT">Crie a Partida</div>
                            <div className="lp2-stepD">Defina o limite de jogadores, se aceita avulsos e configure a data/hora e local.</div>
                        </div>
                        <div className="lp2-step">
                            <div className="lp2-stepN" style={{ color: '#a7f3d0', borderColor: 'rgba(167, 243, 208, 0.3)' }}>02</div>
                            <div className="lp2-stepT">Compartilhe o Link</div>
                            <div className="lp2-stepD">Mande direto no WhatsApp. Cada jogador clica, faz login rápido e confirma a presença.</div>
                        </div>
                        <div className="lp2-step">
                            <div className="lp2-stepN" style={{ color: '#93c5fd', borderColor: 'rgba(147, 197, 253, 0.3)' }}>03</div>
                            <div className="lp2-stepT">Gere os Times</div>
                            <div className="lp2-stepD">Com a lista fechada, aperte um botão para o sistema sortear as equipes nivelando pelas notas.</div>
                        </div>
                    </div>

                    <div className="lp2-finalCta" style={{ marginTop: '32px' }}>
                        <div>
                            <div className="lp2-finalTitle">Sua rede está pronta para subir de nível?</div>
                            <div className="lp2-finalSub">Junte-se a organizadores e atletas que levam o esporte a sério.</div>
                        </div>
                        <button className="lp2-btn" style={{ padding: '14px 24px', fontSize: '15px' }} onClick={() => navigate("/register")}>
                            Criar Minha Conta Grátis
                        </button>
                    </div>

                    <footer className="lp2-footer">
                        <div className="lp2-footerLeft">
                            <img src="/icon-bola.png" className="lp2-footerIcon" style={{ filter: 'grayscale(100%) opacity(0.7)' }} alt="" />
                            <span>ClubeDoFut • A Plataforma Oficial das Quadras e Areias</span>
                        </div>
                        <div className="lp2-footerRight" style={{ display: 'flex', gap: '16px' }}>
                            <button className="lp2-link" onClick={() => navigate("/login")}>Acessar Conta</button>
                            <button className="lp2-link" onClick={() => navigate("/register")}>Novo Cadastro</button>
                        </div>
                    </footer>
                </div>
            </section>
        </main>
    );
}