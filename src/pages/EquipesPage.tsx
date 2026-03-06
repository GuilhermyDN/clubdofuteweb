// src/pages/EquipesPage.tsx
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
    return "Falha de rede / backend indisponível.";
}

function maskCepOuLocal(v: string) {
    const onlyNums = v.replace(/\D/g, "");

    if (/^\d*$/.test(v)) {
        const nums = onlyNums.slice(0, 8);
        if (nums.length <= 5) return nums;
        return `${nums.slice(0, 5)}-${nums.slice(5)}`;
    }

    return v;
}

type DiaKey =
    | "segunda"
    | "terca"
    | "quarta"
    | "quinta"
    | "sexta"
    | "sabado"
    | "domingo";

const DIAS: { key: DiaKey; label: string }[] = [
    { key: "segunda", label: "segunda" },
    { key: "terca", label: "terça" },
    { key: "quarta", label: "quarta" },
    { key: "quinta", label: "quinta" },
    { key: "sexta", label: "sexta" },
    { key: "sabado", label: "sábado" },
    { key: "domingo", label: "domingo" },
];

export default function EquipesPage() {
    const nav = useNavigate();

    // ===== BOOT / MINHAS EQUIPES =====
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

    // ===== FEEDBACK =====
    const [ok, setOk] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    // ===== CRIAR EQUIPE =====
    const [create, setCreate] = useState<CriarEquipeBody>({
        nome: "",
        cepOuLocal: "",
        esporte: "VOLEI",
        statusEquipe: "ABERTA",
        senhaEquipe: "",
        diasHorariosPadrao: "", // vai ser preenchido pela agenda
    });

    // ✅ AGENDA (dias + time picker)
    const [agenda, setAgenda] = useState<Record<DiaKey, { enabled: boolean; time: string }>>({
        segunda: { enabled: false, time: "19:00" },
        terca: { enabled: false, time: "19:00" },
        quarta: { enabled: false, time: "19:00" },
        quinta: { enabled: false, time: "19:00" },
        sexta: { enabled: false, time: "19:00" },
        sabado: { enabled: false, time: "09:00" },
        domingo: { enabled: false, time: "09:00" },
    });

    const diasHorariosPadraoStr = useMemo(() => {
        const parts: string[] = [];
        for (const d of DIAS) {
            const item = agenda[d.key];
            if (item?.enabled) parts.push(`${d.key}-${item.time}`);
        }
        return parts.join(",");
    }, [agenda]);

    const [creating, setCreating] = useState(false);
    const showSenha = create.statusEquipe === "FECHADA";

    function setCreateField<K extends keyof CriarEquipeBody>(k: K, v: CriarEquipeBody[K]) {
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

            // ✅ agora vem da agenda
            diasHorariosPadrao: diasHorariosPadraoStr,
        };

        if (!payload.nome) return setErr("Nome da equipe é obrigatório.");
        if (!payload.cepOuLocal) return setErr("Local é obrigatório.");
        if (!payload.diasHorariosPadrao)
            return setErr("Agenda padrão é obrigatória (habilite ao menos 1 dia).");

        if (payload.statusEquipe === "FECHADA") {
            const s = normalizeStr(create.senhaEquipe ?? "");
            if (!s) return setErr("Equipe FECHADA exige senha.");
            payload.senhaEquipe = s;
        }

        try {
            setCreating(true);
            const created = await criarEquipe(payload);
            setOk(`Equipe criada: ${created.nome}`);
            await loadMinhasEquipes();
            nav(`/equipes/${created.id}`);
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setCreating(false);
        }
    }

    // ===== BUSCAR =====
    const [q, setQ] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchedOnce, setSearchedOnce] = useState(false);

    const [results, setResults] = useState<EquipeResumo[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detalhe, setDetalhe] = useState<EquipeDetalhe | null>(null);

    const [joining, setJoining] = useState(false);
    const [senhaEntrada, setSenhaEntrada] = useState("");

    async function handleBuscar() {
        setErr(null);
        setOk(null);

        const qq = normalizeStr(q);

        try {
            setSearching(true);
            setSearchedOnce(true);

            // ✅ busca mesmo vazio (se backend aceitar, lista tudo ao abrir)
            const list = await buscarEquipes(qq);
            setResults(list ?? []);

            if (!list?.length) {
                setSelectedId(null);
                setDetalhe(null);
            }
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setSearching(false);
        }
    }

    // ✅ buscar ao carregar
    useEffect(() => {
        handleBuscar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function openDetalhe(id: string) {
        setErr(null);
        setOk(null);
        setSelectedId(id);

        try {
            const d = await getEquipe(id);
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
                nav(`/equipes/${selectedId}`);
                return;
            }

            const s = normalizeStr(senhaEntrada);
            if (!s) {
                setErr("Informe a senha da equipe.");
                return;
            }

            await entrarEquipeFechada(selectedId, s);
            setOk("Entrou na equipe.");
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
            {/* NAVBAR SUPERIOR */}
            <header className="eqTop">
                <div className="eqTopInner">
                    <div className="eqTitleRow">
                        <div>
                            <div className="eqBrand">
                                <img src="/logo-oficial.png" alt="logo" className="eqLogo" />
                                <span className="eqTitle">Equipes</span>
                            </div>
                            <div className="eqSub">
                                Encontre equipes, crie a sua ou participe de uma existente.
                            </div>
                        </div>

                        <div className="eqTopRight">
                            <button
                                type="button"
                                className="eqGhostBtn"
                                onClick={() => nav("/eu")}
                            >
                                Perfil
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTEÚDO */}
            <section className="eqContent">
                <div className="eqWrap">
                    {bootLoading && <div className="eqMsg">Carregando suas equipes...</div>}

                    {bootErr && (
                        <div className="eqMsg err">
                            {bootErr}
                            <button
                                type="button"
                                className="eqBtn"
                                onClick={loadMinhasEquipes}
                                style={{ marginTop: 10 }}
                            >
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {(ok || err) && <div className={`eqMsg ${ok ? "ok" : "err"}`}>{ok ?? err}</div>}

                    {/* MINHAS EQUIPES */}
                    {temEquipe && (
                        <section className="eqCard">
                            <div className="eqCardTitle">Minhas equipes</div>

                            <div className="eqList">
                                {minhasEquipes.map((r) => (
                                    <button
                                        type="button"
                                        key={r.id}
                                        className="eqItem"
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

                    {/* GRID */}
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
                                    <span>Local</span>
                                    <input
                                        className="eqInput"
                                        value={maskCepOuLocal(create.cepOuLocal)}
                                        onChange={(e) => {
                                            const v = e.target.value;

                                            if (/^\d*$/.test(v)) {
                                                setCreateField("cepOuLocal", v.replace(/\D/g, "").slice(0, 8));
                                            } else {
                                                setCreateField("cepOuLocal", v);
                                            }
                                        }}
                                    />
                                </label>

                                <div className="eqRow2">
                                    <label className="eqLabel">
                                        <span>Esporte</span>
                                        <div className="eqSelectWrap">
                                            <select
                                                className="eqSelect"
                                                value={create.esporte}
                                                onChange={(e) =>
                                                    setCreateField("esporte", e.target.value as Esporte)
                                                }
                                            >
                                                <option value="VOLEI">VOLEI</option>
                                                <option value="FUTEVOLEI">FUTEVOLEI</option>
                                            </select>
                                            <span className="eqSelectArrow" aria-hidden="true" />
                                        </div>
                                    </label>

                                    <label className="eqLabel">
                                        <span>Status</span>
                                        <div className="eqSelectWrap">
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
                                            <span className="eqSelectArrow" aria-hidden="true" />
                                        </div>
                                    </label>
                                </div>

                                {showSenha && (
                                    <label className="eqLabel">
                                        <span>Senha</span>
                                        <input
                                            className="eqInput"
                                            value={create.senhaEquipe ?? ""}
                                            onChange={(e) => setCreateField("senhaEquipe", e.target.value)}
                                        />
                                    </label>
                                )}

                                {/* ✅ AGENDA: dias + time picker (só habilita quando marcar) */}
                                <div className="eqAgenda">
                                    <div className="eqAgendaTitle">Agenda padrão</div>
                                    <div className="eqAgendaHint">Marque os dias e escolha o horário.</div>

                                    <div className="eqAgendaGrid">
                                        {DIAS.map((d) => {
                                            const item = agenda[d.key];

                                            return (
                                                <div
                                                    key={d.key}
                                                    className={`eqAgendaRow ${item.enabled ? "on" : ""}`}
                                                >
                                                    <label className="eqAgendaDay">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.enabled}
                                                            onChange={(e) => {
                                                                const enabled = e.target.checked;
                                                                setAgenda((prev) => ({
                                                                    ...prev,
                                                                    [d.key]: { ...prev[d.key], enabled },
                                                                }));
                                                            }}
                                                        />
                                                        <span>{d.label}</span>
                                                    </label>

                                                    <input
                                                        type="time"
                                                        className="eqAgendaTime"
                                                        value={item.time}
                                                        disabled={!item.enabled}
                                                        onChange={(e) => {
                                                            const time = e.target.value;
                                                            setAgenda((prev) => ({
                                                                ...prev,
                                                                [d.key]: { ...prev[d.key], time },
                                                            }));
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="eqBtn primary"
                                    onClick={handleCriarEquipe}
                                    disabled={creating}
                                >
                                    {creating ? "Criando..." : "Criar equipe"}
                                </button>
                            </div>
                        </section>

                        {/* BUSCAR */}
                        <section className="eqCard">
                            <div className="eqCardTitle">Buscar equipe</div>

                            <div className="eqForm">
                                <div className="eqSearchRow">
                                    <input
                                        className="eqInput"
                                        placeholder="Nome da equipe..."
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleBuscar();
                                        }}
                                    />

                                    <button
                                        type="button"
                                        className="eqBtn"
                                        onClick={handleBuscar}
                                        disabled={searching}
                                    >
                                        {searching ? "..." : "Buscar"}
                                    </button>
                                </div>

                                <div className="eqList">
                                    {results.length === 0 ? (
                                        <div className="eqEmpty">
                                            {searchedOnce
                                                ? (q.trim()
                                                    ? "Equipe não encontrada."
                                                    : "Nenhuma equipe disponível no momento.")
                                                : "Carregando..."}
                                        </div>
                                    ) : (
                                        results.map((r) => (
                                            <button
                                                type="button"
                                                key={r.id}
                                                className={`eqItem ${String(selectedId) === String(r.id) ? "active" : ""
                                                    }`}
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
                                            type="button"
                                            className="eqBtn"
                                            onClick={() => nav(`/equipes/${selectedId}`)}
                                        >
                                            Ver detalhes
                                        </button>

                                        {statusEquipe === "FECHADA" && (
                                            <label className="eqLabel">
                                                <span>Senha</span>
                                                <input
                                                    className="eqInput"
                                                    value={senhaEntrada}
                                                    onChange={(e) => setSenhaEntrada(e.target.value)}
                                                />
                                            </label>
                                        )}

                                        <button
                                            type="button"
                                            className="eqBtn primary"
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
                </div>
            </section>
        </main>
    );
}