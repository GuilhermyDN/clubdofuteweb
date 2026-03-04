import { useNavigate } from "react-router-dom";

const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp2-accent2">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);
const NetIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v16M20 4v16M4 8h16M4 12h16M4 16h16M8 4v16M12 4v16M16 4v16" opacity="0.8" /></svg>
);
const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const ChartIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg>
);

export default function Beneficios() {
    const navigate = useNavigate();
    const path = window.location.pathname;

    return (
        <main className="lp2">
            <header className="lp2-nav">
                <div className="lp2-nav-inner">
                    <button className="lp2-brand" onClick={() => navigate("/")}>
                        <img src="/icon-bola.png" className="lp2-brand-logo" alt="ClubeDoFut" />
                        <span className="lp2-brand-name">ClubeDoFut</span>
                    </button>
                    <nav className="lp2-links">
                        <button className={`lp2-link ${path === '/' ? 'active' : ''}`} onClick={() => navigate("/")}>Início</button>
                        <button className={`lp2-link ${path === '/beneficios' ? 'active' : ''}`} onClick={() => navigate("/beneficios")}>Benefícios</button>
                        <button className={`lp2-link ${path === '/modalidades' ? 'active' : ''}`} onClick={() => navigate("/modalidades")}>Modalidades</button>
                        <button className={`lp2-link ${path === '/como-funciona' ? 'active' : ''}`} onClick={() => navigate("/como-funciona")}>Como Funciona</button>
                    </nav>
                    <div className="lp2-actions">
                        <button className="lp2-btn ghost" onClick={() => navigate("/login")}>Entrar</button>
                        <button className="lp2-btn" onClick={() => navigate("/register")}>Criar Conta</button>
                    </div>
                </div>
            </header>

            <section className="lp2-section">
                <div className="lp2-container lp2-split">
                    <div>
                        <h2 className="lp2-h2">O fim da "panela" desequilibrada.</h2>
                        <p className="lp2-p">
                            Sabemos o quanto é frustrante organizar um jogo onde um time é muito mais forte que o outro.
                            Nossa plataforma foi desenhada para a realidade das quadras tradicionais e da areia.
                        </p>
                        <div className="lp2-bullets">
                            <div className="lp2-bullet">
                                <div className="lp2-check" style={{ display: 'grid', placeItems: 'center' }}><CheckIcon /></div>
                                <span>Algoritmo de nivelamento baseado em notas (0 a 10)</span>
                            </div>
                            <div className="lp2-bullet">
                                <div className="lp2-check" style={{ display: 'grid', placeItems: 'center' }}><CheckIcon /></div>
                                <span>Controle exato de limite de participantes (6x6, 4x4, 2x2)</span>
                            </div>
                            <div className="lp2-bullet">
                                <div className="lp2-check" style={{ display: 'grid', placeItems: 'center' }}><CheckIcon /></div>
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

            <footer className="lp2-footer" style={{ width: 'min(1120px, calc(100% - 32px))', margin: '0 auto 32px' }}>
                <div className="lp2-footerLeft">
                    <img src="/icon-bola.png" className="lp2-footerIcon" style={{ filter: 'grayscale(100%) opacity(0.7)' }} alt="" />
                    <span>ClubeDoFut • A Plataforma Oficial das Quadras e Areias</span>
                </div>
                <div className="lp2-footerRight" style={{ display: 'flex', gap: '16px' }}>
                    <button className="lp2-link" onClick={() => navigate("/login")}>Acessar Conta</button>
                    <button className="lp2-link" onClick={() => navigate("/register")}>Novo Cadastro</button>
                </div>
            </footer>
        </main>
    );
}