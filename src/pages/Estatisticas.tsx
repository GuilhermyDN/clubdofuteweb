import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import CountUp from "../components/CountUp";
import { toast } from "../components/Toast";
import { explainError, isAuthError, isNotImplemented } from "../utils/errors";
import { getEstatisticas, type Estatisticas as Stats } from "../services/estatisticas";

export default function EstatisticasPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Stats | null>(null);
    const [notImplemented, setNotImplemented] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const s = await getEstatisticas();
            setData(s);
            setNotImplemented(false);
        } catch (e: any) {
            if (isAuthError(e)) return;
            if (isNotImplemented(e)) {
                setNotImplemented(true);
                return;
            }
            toast.error(explainError(e), "Falha ao carregar estatísticas");
        } finally { setLoading(false); }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    return (
        <div className="x-app">
            <AppHeader />

            <main className="x-app-main">
                <div className="x-app-container">
                    <div className="x-page-head">
                        <div>
                            <h1 className="x-page-title">Estatísticas</h1>
                            <p className="x-page-sub">
                                Seu desempenho, histórico e ranking dentro do clube.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="x-loading"><div className="x-spinner" /> Carregando...</div>
                    ) : notImplemented ? (
                        <div className="x-empty">
                            <div className="x-empty-icon">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 3v18h18" />
                                    <path d="M7 15l4-4 3 3 5-6" />
                                </svg>
                            </div>
                            <h3 className="x-empty-title">Em breve</h3>
                            <p className="x-empty-text">
                                A tela de estatísticas está em desenvolvimento. Em breve você vai
                                conseguir acompanhar seu desempenho, ranking e histórico de partidas por aqui.
                            </p>
                        </div>
                    ) : data ? (
                        <div className="x-stats x-stagger">
                            <div className="x-stat x-reveal">
                                <div className="x-stat-lbl">Partidas jogadas</div>
                                <div className="x-stat-val"><CountUp to={data.totalPartidasJogadas ?? 0} /></div>
                            </div>
                            <div className="x-stat x-reveal">
                                <div className="x-stat-lbl">Confirmadas</div>
                                <div className="x-stat-val"><CountUp to={data.totalPartidasConfirmadas ?? 0} /></div>
                            </div>
                            <div className="x-stat x-reveal">
                                <div className="x-stat-lbl">Equipes</div>
                                <div className="x-stat-val"><CountUp to={data.totalEquipes ?? 0} /></div>
                            </div>
                            <div className="x-stat x-reveal">
                                <div className="x-stat-lbl">Nota média vôlei</div>
                                <div className="x-stat-val">
                                    {data.notaMediaVolei != null
                                        ? <CountUp to={data.notaMediaVolei} decimals={1} />
                                        : "—"}
                                </div>
                            </div>
                            <div className="x-stat x-reveal">
                                <div className="x-stat-lbl">Nota média futevôlei</div>
                                <div className="x-stat-val">
                                    {data.notaMediaFutevolei != null
                                        ? <CountUp to={data.notaMediaFutevolei} decimals={1} />
                                        : "—"}
                                </div>
                            </div>
                            {data.rankingPosicao != null && (
                                <div className="x-stat x-reveal">
                                    <div className="x-stat-lbl">Ranking</div>
                                    <div className="x-stat-val"><em>#<CountUp to={data.rankingPosicao} /></em></div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </main>
        </div>
    );
}
