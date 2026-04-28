import { useEffect, useState } from "react";
import UserAvatar from "./UserAvatar";
import { getEstatisticasUsuario } from "../services/estatisticas";
import type { Estatisticas } from "../services/estatisticas";
import { explainError, isAuthError } from "../utils/errors";

type Props = {
    usuarioId: number | string;
    nome?: string | null;
    fotoPerfil?: string | null;
    onClose: () => void;
};

function fmtNum(v: number | null | undefined, digits = 1) {
    if (v == null || !Number.isFinite(v)) return "—";
    return Number(v).toFixed(digits);
}

export default function UserDetalheModal({ usuarioId, nome, fotoPerfil, onClose }: Props) {
    const [stats, setStats] = useState<Estatisticas | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const s = await getEstatisticasUsuario(usuarioId);
                if (alive) setStats(s);
            } catch (e: any) {
                if (isAuthError(e)) return;
                if (alive) setErr(explainError(e));
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [usuarioId]);

    const displayNome = stats?.nome ?? nome ?? "Jogador";

    return (
        <div className="x-modal-overlay" onClick={onClose}>
            <div className="x-modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
                    <UserAvatar nome={displayNome} fotoPerfil={fotoPerfil} size="lg" />
                    <div style={{ minWidth: 0 }}>
                        <div className="x-eyebrow">Jogador</div>
                        <h3 className="x-modal-title" style={{ margin: 0 }}>{displayNome}</h3>
                    </div>
                </div>

                {loading && <div className="x-loading"><div className="x-spinner" /> Carregando...</div>}
                {!loading && err && <p className="x-modal-text" style={{ color: "#ff8a8a" }}>{err}</p>}

                {!loading && !err && stats && (
                    <div className="x-info-grid">
                        <div className="x-info-item">
                            <span className="x-info-lbl">Nota atual</span>
                            <span className="x-info-val" style={{ color: "var(--x-accent)" }}>
                                ★ {fmtNum(stats.notaAtual)}
                            </span>
                        </div>
                        <div className="x-info-item">
                            <span className="x-info-lbl">Partidas</span>
                            <span className="x-info-val">{stats.totalPartidas ?? 0}</span>
                        </div>
                        <div className="x-info-item">
                            <span className="x-info-lbl">Média recebida</span>
                            <span className="x-info-val">★ {fmtNum(stats.mediaNotasRecebidas)}</span>
                        </div>
                    </div>
                )}

                <div className="x-modal-actions" style={{ marginTop: 18 }}>
                    <button className="x-btn ghost" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
}
