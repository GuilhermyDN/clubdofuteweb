import { useNavigate } from "react-router-dom";

export default function Modalidades() {
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

            <section className="lp2-section alt" style={{ minHeight: '70vh' }}>
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