import { useNavigate } from "react-router-dom";

export default function ComoFunciona() {
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