import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEquipe } from "../services/equipe";
import {
    criarPartidaEquipe,
    listarPartidasEquipe,
    type CriarPartidaBody,
    type PartidaResumo,
    type PoliticaInscricao,
} from "../services/equipePartidas";
import { api } from "../services/api";

type EuResponse = {
    id: number;
    nome?: string;
};

function fmtDataHora(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR");
}

function toLocalInputValue(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

function toIsoFromDatetimeLocal(v: string) {
    // v: "YYYY-MM-DDTHH:mm" (local) -> ISO
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

function explainAxiosError(e: any) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    if (status) return `Erro (HTTP ${status}): ${JSON.stringify(data)}`;
    return "Falha de rede / CORS / backend fora.";
}

export default function EquipePartidasPage() {
    const { equipeId } = useParams();
    const nav = useNavigate();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const [partidas, setPartidas] = useState<PartidaResumo[]>([]);
    const [souAdmin, setSouAdmin] = useState(false);

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<CriarPartidaBody>(() => ({
        dataHora: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        politicaInscricao: "SOMENTE_MEMBROS",
        jogadoresPorTime: 4,
        limiteParticipantes: undefined,
    }));

    const dataHoraLocal = useMemo(() => {
        const d = new Date(form.dataHora);
        if (Number.isNaN(d.getTime())) return toLocalInputValue(new Date());
        return toLocalInputValue(d);
    }, [form.dataHora]);

    async function loadAll() {
        if (!equipeId) {
            setErr("ID da equipe ausente.");
            setLoading(false);
            return;
        }

        setErr(null);
        setOk(null);
        setLoading(true);

        try {
            // 1) meu usuario
            const euRes = await api.get<EuResponse>("/eu");
            const meuId = euRes.data?.id;

            // 2) equipe p/ descobrir papel
            const equipe = await getEquipe(equipeId);

            const isAdmin =
                !!meuId &&
                (equipe.membros ?? []).some((m) => {
                    const papel = String((m as any).papel ?? "").toUpperCase();
                    const isAdminRole = papel === "ADMIN" || papel === "ADMINISTRADOR";
                    return m.usuarioId === meuId && m.ativo && isAdminRole;
                });

            setSouAdmin(isAdmin);

            // 3) partidas
            const list = await listarPartidasEquipe(equipeId);
            setPartidas(list ?? []);
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 401 || status === 403) {
                nav("/login");
                return;
            }
            setErr(explainAxiosError(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipeId]);

    async function onCriarPartida() {
        if (!equipeId) return;

        setErr(null);
        setOk(null);

        if (!souAdmin) {
            setErr("Você não é ADMIN desta equipe (segundo o backend).");
            return;
        }

        const iso = toIsoFromDatetimeLocal(dataHoraLocal);
        if (!iso) {
            setErr("Data/Hora inválida.");
            return;
        }

        const body: CriarPartidaBody = {
            dataHora: iso,
            politicaInscricao: form.politicaInscricao as PoliticaInscricao,
            jogadoresPorTime: Number(form.jogadoresPorTime),
            limiteParticipantes:
                form.limiteParticipantes === undefined ||
                    form.limiteParticipantes === null ||
                    (form.limiteParticipantes as any) === ""
                    ? undefined
                    : Number(form.limiteParticipantes),
        };

        if (!body.politicaInscricao) return setErr("Política é obrigatória.");
        if (!body.jogadoresPorTime || body.jogadoresPorTime <= 0)
            return setErr("Jogadores por time deve ser > 0.");
        if (body.limiteParticipantes !== undefined && body.limiteParticipantes < 0)
            return setErr("Limite não pode ser negativo.");

        try {
            setCreating(true);
            await criarPartidaEquipe(equipeId, body);
            setOk("Partida criada.");
            await loadAll();
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setCreating(false);
        }
    }

    if (loading) return <div className="pdLoading">Carregando partidas...</div>;

    return (
        <div className="pdShell">
            <div className="pdPanel">
                {/* TOP */}
                <div className="pdTopBar">
                    <button
                        className="pdIconBtn"
                        onClick={() => nav(-1)}
                        type="button"
                        aria-label="Voltar"
                    >
                        ←
                    </button>

                    <div className="pdTopTitle">Partidas da equipe</div>

                    <button
                        className="pdGhostBtn"
                        type="button"
                        onClick={() => nav(`/equipes/${equipeId}`)}
                    >
                        Equipe
                    </button>
                </div>

                {(ok || err) && (
                    <div className={`pdMsg ${ok ? "ok" : "err"}`}>{ok ?? err}</div>
                )}

                {/* CRIAR */}
                <div className="pdSectionTitle">Criar partida</div>

                {!souAdmin ? (
                    <div className="pdMsg">
                        Apenas administradores podem criar partidas.
                    </div>
                ) : (
                    <div className="pdFormWrap">
                        <div className="pdFormGrid">
                            <div className="pdFieldCard">
                                <div className="pdFieldLabel">Data/Hora</div>
                                <input
                                    className="pdField"
                                    type="datetime-local"
                                    value={dataHoraLocal}
                                    onChange={(e) => {
                                        const iso2 = toIsoFromDatetimeLocal(e.target.value);
                                        if (!iso2) return;
                                        setForm((p) => ({ ...p, dataHora: iso2 }));
                                    }}
                                />
                            </div>

                            <div className="pdFieldCard">
                                <div className="pdFieldLabel">Política</div>
                                <select
                                    className="pdField"
                                    value={form.politicaInscricao}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            politicaInscricao: e.target.value as any,
                                        }))
                                    }
                                >
                                    <option value="SOMENTE_MEMBROS">SOMENTE_MEMBROS</option>
                                    <option value="AVULSOS_ABERTOS">AVULSOS_ABERTOS</option>
                                </select>
                            </div>

                            <div className="pdFieldCard">
                                <div className="pdFieldLabel">Jogadores por time</div>
                                <input
                                    className="pdField"
                                    type="number"
                                    min={1}
                                    value={String(form.jogadoresPorTime)}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            jogadoresPorTime: Number(e.target.value),
                                        }))
                                    }
                                />
                            </div>

                            <div className="pdFieldCard">
                                <div className="pdFieldLabel">
                                    Limite participantes <span className="pdHint">(opcional)</span>
                                </div>
                                <input
                                    className="pdField"
                                    type="number"
                                    min={0}
                                    value={
                                        form.limiteParticipantes === undefined
                                            ? ""
                                            : String(form.limiteParticipantes)
                                    }
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setForm((p) => ({
                                            ...p,
                                            limiteParticipantes: v === "" ? undefined : Number(v),
                                        }));
                                    }}
                                    placeholder="vazio = sem limite"
                                />
                            </div>
                        </div>

                        <div className="pdActions">
                            <button
                                className="pdBtn primary"
                                type="button"
                                onClick={onCriarPartida}
                                disabled={creating}
                            >
                                {creating ? "Criando..." : "Criar partida"}
                            </button>

                            <button
                                className="pdBtn"
                                type="button"
                                onClick={loadAll}
                                disabled={creating}
                            >
                                Recarregar
                            </button>
                        </div>
                    </div>
                )}

                {/* LISTA */}
                <div className="pdSectionTitle">Partidas</div>

                {partidas.length === 0 ? (
                    <div className="pdEmpty">Nenhuma partida criada ainda</div>
                ) : (
                    <div className="pdTable">
                        <div className="pdTr pdTh">
                            <div>STATUS</div>
                            <div>DATA/HORA</div>
                            <div>CONF.</div>
                        </div>

                        {partidas.map((p) => (
                            <div
                                key={p.id}
                                className="pdTr"
                                onClick={() => nav(`/partidas/${p.id}`)}
                                style={{ cursor: "pointer" }}
                            >
                                <div className="pdTd pdPos">{p.statusPartida}</div>
                                <div className="pdTd pdNameCell">{fmtDataHora(p.dataHora)}</div>
                                <div className="pdTd muted">{p.totalConfirmados}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* HUD FIX (deixa alinhado no web) */}
            <style>{`
        .pdFormWrap{ padding: 0 12px 12px; }
        .pdFormGrid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-items: stretch;
        }
        .pdFieldCard{
          border-radius:14px;
          padding:10px 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          display:flex;
          flex-direction:column;
          gap:8px;
          min-width:0;
        }
        .pdFieldLabel{
          font-size:10px;
          font-weight:900;
          color: rgba(255,255,255,0.55);
        }
        .pdHint{ color: rgba(255,255,255,0.45); font-weight:900; }
        .pdField{
          width:100%;
          border-radius:12px;
          padding:12px 12px;
          outline:none;
          font-weight:900;
          color:#fff;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .pdField:focus{
          border-color: rgba(254,240,138,0.25);
          box-shadow: 0 0 0 3px rgba(254,240,138,0.10);
        }
        .pdActions{
          margin-top:12px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 520px){
          .pdFormGrid{ grid-template-columns: 1fr; }
          .pdActions{ grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
}