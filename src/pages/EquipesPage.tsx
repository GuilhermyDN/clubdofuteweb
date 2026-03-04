import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
    CriarEquipeBody,
    EquipeDetalhe,
    EquipeResumo,
    Esporte,
    StatusEquipe,
} from "../services/equipe";
import {
    buscarEquipes,
    criarEquipe,
    entrarEquipeAberta,
    entrarEquipeFechada,
    getEquipe,
    listarMinhasEquipes,
} from "../services/equipe";

function normalizeStr(v: string) {
    return (v ?? "").trim();
}

function explainAxiosError(e: any) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    if (status) return `Erro (HTTP ${status}): ${JSON.stringify(data)}`;
    return "Falha de rede / CORS / backend fora.";
}

export default function EquipesPage() {
    const nav = useNavigate();

    // ====== MEUS DADOS (GATE) ======
    const [bootLoading, setBootLoading] = useState(true);
    const [bootErr, setBootErr] = useState<string | null>(null);
    const [minhasEquipes, setMinhasEquipes] = useState<EquipeResumo[]>([]);

    async function loadMinhasEquipes() {
        setBootErr(null);
        try {
            const list = await listarMinhasEquipes();
            setMinhasEquipes(list ?? []);
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 401 || status === 403) {
                nav("/login");
                return;
            }
            setBootErr(explainAxiosError(e));
        } finally {
            setBootLoading(false);
        }
    }

    useEffect(() => {
        loadMinhasEquipes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ====== FEEDBACK ======
    const [ok, setOk] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    // ====== CRIAR EQUIPE ======
    const [create, setCreate] = useState<CriarEquipeBody>({
        nome: "",
        cepOuLocal: "",
        esporte: "VOLEI",
        statusEquipe: "ABERTA",
        senhaEquipe: "",
        diasHorariosPadrao: "",
    });
    const showSenha = create.statusEquipe === "FECHADA";
    const [creating, setCreating] = useState(false);

    function setCreateField<K extends keyof CriarEquipeBody>(
        k: K,
        v: CriarEquipeBody[K]
    ) {
        setCreate((p) => ({ ...p, [k]: v }));
    }

    async function handleCriarEquipe() {
        setErr(null);
        setOk(null);

        const payload: CriarEquipeBody = {
            nome: normalizeStr(create.nome),
            cepOuLocal: normalizeStr(create.cepOuLocal),
            esporte: create.esporte,
            statusEquipe: create.statusEquipe,
            diasHorariosPadrao: normalizeStr(create.diasHorariosPadrao),
        };

        if (!payload.nome) return setErr("Nome da equipe é obrigatório.");
        if (!payload.cepOuLocal) return setErr("CEP ou Local é obrigatório.");
        if (!payload.diasHorariosPadrao)
            return setErr("Dias/Horários padrão é obrigatório.");

        if (payload.statusEquipe === "FECHADA") {
            const s = normalizeStr(create.senhaEquipe ?? "");
            if (!s) return setErr("Equipe FECHADA exige senhaEquipe.");
            payload.senhaEquipe = s;
        }

        try {
            setCreating(true);
            const created = await criarEquipe(payload);
            setOk(`Equipe criada: ${created.nome}`);
            await loadMinhasEquipes();
            // opcional: já ir pra tela da equipe criada
            nav(`/equipes/${created.id}`);
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setCreating(false);
        }
    }

    // ====== BUSCAR/ENTRAR ======
    const [q, setQ] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<EquipeResumo[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detalhe, setDetalhe] = useState<EquipeDetalhe | null>(null);

    const [joining, setJoining] = useState(false);
    const [senhaEntrada, setSenhaEntrada] = useState("");

    async function handleBuscar() {
        setErr(null);
        setOk(null);

        const qq = normalizeStr(q);
        if (!qq) {
            setResults([]);
            setDetalhe(null);
            setSelectedId(null);
            return;
        }

        try {
            setSearching(true);
            const list = await buscarEquipes(qq);
            setResults(list ?? []);
            setSelectedId(null);
            setDetalhe(null);
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setSearching(false);
        }
    }

    async function openDetalhe(equipeId: string) {
        setErr(null);
        setOk(null);
        setSelectedId(equipeId);

        try {
            const d = await getEquipe(equipeId);
            setDetalhe(d);
            setSenhaEntrada("");
        } catch (e: any) {
            setErr(explainAxiosError(e));
        }
    }

    const selectedResumo = useMemo(
        () => results.find((r) => String(r.id) === String(selectedId)) ?? null,
        [results, selectedId]
    );

    const statusEquipe: StatusEquipe | null =
        (detalhe?.statusEquipe ?? (selectedResumo as any)?.statusEquipe) ?? null;

    async function handleEntrar() {
        if (!selectedId) return;
        setErr(null);
        setOk(null);

        try {
            setJoining(true);

            if (statusEquipe === "ABERTA") {
                await entrarEquipeAberta(selectedId);
                setOk("Entrou na equipe.");
                await loadMinhasEquipes();
                nav(`/equipes/${selectedId}`);
                return;
            }

            const s = normalizeStr(senhaEntrada);
            if (!s) {
                setErr("Equipe FECHADA: informe a senha.");
                return;
            }

            await entrarEquipeFechada(selectedId, s);
            setOk("Entrou na equipe.");
            await loadMinhasEquipes();
            nav(`/equipes/${selectedId}`);
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setJoining(false);
        }
    }

    const temEquipe = minhasEquipes.length > 0;

    return (
        <main className="eqPage">
            {/* TOP */}
            <header className="eqTop">
                <div className="eqTopInner">
                    <div className="eqTitleRow">
                        <div>
                            <div className="eqTitle">Equipes</div>
                            <div className="eqSub">
                                Busque, entre ou crie uma equipe.
                            </div>
                        </div>

                        <div className="eqTopRight">
                            <button
                                className="eqGhostBtn"
                                type="button"
                                onClick={() => nav("/home-logado")}
                            >
                                Home
                            </button>
                            <button
                                className="eqGhostBtn"
                                type="button"
                                onClick={() => nav("/eu")}
                            >
                                Perfil
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <section className="eqContent">
                <div className="eqWrap">
                    {bootLoading ? (
                        <div className="eqMsg">Carregando suas equipes...</div>
                    ) : bootErr ? (
                        <div className="eqMsg err">
                            {bootErr}
                            <div style={{ height: 10 }} />
                            <button className="eqBtn" type="button" onClick={loadMinhasEquipes}>
                                Tentar novamente
                            </button>
                        </div>
                    ) : (
                        <>
                            {(ok || err) && (
                                <div className={`eqMsg ${ok ? "ok" : "err"}`}>{ok ?? err}</div>
                            )}

                            {temEquipe && (
                                <section className="eqCard">
                                    <div className="eqCardTitle">Minhas equipes</div>
                                    <div className="eqList">
                                        {minhasEquipes.map((r) => (
                                            <button
                                                key={r.id}
                                                className="eqItem"
                                                type="button"
                                                onClick={() => nav(`/equipes/${r.id}`)}
                                            >
                                                <div className="eqItemTitle">{r.nome}</div>
                                                <div className="eqItemSub">
                                                    {r.esporte} • {r.statusEquipe} • {r.cepOuLocal}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <div className="eqGrid">
                                {/* CRIAR */}
                                <section className="eqCard">
                                    <div className="eqCardTitle">Criar equipe</div>

                                    <div className="eqForm">
                                        <label className="eqLabel">
                                            <span>Nome</span>
                                            <input
                                                className="eqInput"
                                                value={create.nome}
                                                onChange={(e) => setCreateField("nome", e.target.value)}
                                            />
                                        </label>

                                        <label className="eqLabel">
                                            <span>CEP ou Local</span>
                                            <input
                                                className="eqInput"
                                                value={create.cepOuLocal}
                                                onChange={(e) =>
                                                    setCreateField("cepOuLocal", e.target.value)
                                                }
                                            />
                                        </label>

                                        <div className="eqRow2">
                                            <label className="eqLabel">
                                                <span>Esporte</span>
                                                <select
                                                    className="eqSelect"
                                                    value={create.esporte}
                                                    onChange={(e) =>
                                                        setCreateField("esporte", e.target.value as Esporte)
                                                    }
                                                >
                                                    <option value="VOLEI">VOLEI</option>
                                                    <option value="FUTEBOL">FUTEBOL</option>
                                                    <option value="FUTEVOLEI">FUTEVOLEI</option>
                                                </select>
                                            </label>

                                            <label className="eqLabel">
                                                <span>Status</span>
                                                <select
                                                    className="eqSelect"
                                                    value={create.statusEquipe}
                                                    onChange={(e) =>
                                                        setCreateField(
                                                            "statusEquipe",
                                                            e.target.value as StatusEquipe
                                                        )
                                                    }
                                                >
                                                    <option value="ABERTA">ABERTA</option>
                                                    <option value="FECHADA">FECHADA</option>
                                                </select>
                                            </label>
                                        </div>

                                        {showSenha && (
                                            <label className="eqLabel">
                                                <span>Senha da equipe (somente FECHADA)</span>
                                                <input
                                                    className="eqInput"
                                                    value={create.senhaEquipe ?? ""}
                                                    onChange={(e) =>
                                                        setCreateField("senhaEquipe", e.target.value)
                                                    }
                                                />
                                            </label>
                                        )}

                                        <label className="eqLabel">
                                            <span>Dias/Horários padrão</span>
                                            <input
                                                className="eqInput"
                                                value={create.diasHorariosPadrao}
                                                onChange={(e) =>
                                                    setCreateField("diasHorariosPadrao", e.target.value)
                                                }
                                                placeholder="Ex.: Sábados às 9h"
                                            />
                                        </label>

                                        <button
                                            className="eqBtn primary"
                                            type="button"
                                            onClick={handleCriarEquipe}
                                            disabled={creating}
                                        >
                                            {creating ? "Criando..." : "Criar equipe"}
                                        </button>
                                    </div>
                                </section>

                                {/* BUSCAR/ENTRAR */}
                                <section className="eqCard">
                                    <div className="eqCardTitle">Buscar / Entrar</div>

                                    <div className="eqForm">
                                        <label className="eqLabel">
                                            <span>Buscar equipe</span>
                                            <div className="eqSearchRow">
                                                <input
                                                    className="eqInput"
                                                    value={q}
                                                    onChange={(e) => setQ(e.target.value)}
                                                    placeholder="Nome, local, CEP..."
                                                />
                                                <button
                                                    className="eqBtn"
                                                    type="button"
                                                    onClick={handleBuscar}
                                                    disabled={searching}
                                                >
                                                    {searching ? "..." : "Buscar"}
                                                </button>
                                            </div>
                                        </label>

                                        <div className="eqList">
                                            {results.length === 0 ? (
                                                <div className="eqEmpty">Nenhum resultado.</div>
                                            ) : (
                                                results.map((r) => (
                                                    <button
                                                        key={r.id}
                                                        className={`eqItem ${String(selectedId) === String(r.id) ? "active" : ""
                                                            }`}
                                                        type="button"
                                                        onClick={() => openDetalhe(String(r.id))}
                                                    >
                                                        <div className="eqItemTitle">{r.nome}</div>
                                                        <div className="eqItemSub">
                                                            {r.esporte} • {r.statusEquipe} • {r.cepOuLocal}
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>

                                        {selectedId && (
                                            <div className="eqDetails">
                                                <div className="eqDetailsTitle">Detalhes</div>

                                                <div className="eqDetailsRow">
                                                    <span>Status</span>
                                                    <strong>{statusEquipe ?? "—"}</strong>
                                                </div>

                                                <button
                                                    className="eqBtn"
                                                    type="button"
                                                    onClick={() => nav(`/equipes/${selectedId}`)}
                                                >
                                                    Ver detalhes
                                                </button>

                                                {statusEquipe === "FECHADA" && (
                                                    <label className="eqLabel">
                                                        <span>Senha para entrar</span>
                                                        <input
                                                            className="eqInput"
                                                            value={senhaEntrada}
                                                            onChange={(e) => setSenhaEntrada(e.target.value)}
                                                        />
                                                    </label>
                                                )}

                                                <button
                                                    className="eqBtn primary"
                                                    type="button"
                                                    onClick={handleEntrar}
                                                    disabled={joining}
                                                >
                                                    {joining ? "Entrando..." : "Entrar"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* NAV */}
                            <nav className="eqBottomNav">
                                <button
                                    type="button"
                                    className="eqNavItem"
                                    onClick={() => nav("/home-logado")}
                                >
                                    Home
                                </button>
                                <button
                                    type="button"
                                    className="eqNavItem active"
                                    onClick={() => nav("/equipes")}
                                >
                                    Equipes
                                </button>
                                <button
                                    type="button"
                                    className="eqNavItem"
                                    onClick={() => nav("/eu")}
                                >
                                    Perfil
                                </button>
                            </nav>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}