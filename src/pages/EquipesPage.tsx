import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CriarEquipeBody, EquipeDetalhe, EquipeResumo, Esporte, StatusEquipe } from "../services/equipe";
import {
    buscarEquipes, criarEquipe, entrarEquipeAberta, entrarEquipeFechada, getEquipe, listarMinhasEquipes,
} from "../services/equipe";
import AppHeader from "../components/AppHeader";
import { toast } from "../components/Toast";
import { explainError, isAuthError } from "../utils/errors";

function normalizeStr(v: string) { return (v ?? "").trim(); }
function maskCepOuLocal(v: string) {
    const onlyNums = v.replace(/\D/g, "");
    if (/^\d*$/.test(v)) {
        const nums = onlyNums.slice(0, 8);
        if (nums.length <= 5) return nums;
        return `${nums.slice(0, 5)}-${nums.slice(5)}`;
    }
    return v;
}

type DiaKey = "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo";
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
    const [searchParams, setSearchParams] = useSearchParams();

    const [bootLoading, setBootLoading] = useState(true);
    const [minhasEquipes, setMinhasEquipes] = useState<EquipeResumo[]>([]);

    async function loadMinhasEquipes() {
        try {
            const list = await listarMinhasEquipes();
            setMinhasEquipes(list ?? []);
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha ao carregar equipes");
        } finally { setBootLoading(false); }
    }

    useEffect(() => { loadMinhasEquipes(); /* eslint-disable-next-line */ }, []);

    const [create, setCreate] = useState<CriarEquipeBody>({
        nome: "", cepOuLocal: "", esporte: "VOLEI", statusEquipe: "ABERTA", senhaEquipe: "", diasHorariosPadrao: "",
    });

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
    const [showCreate, setShowCreate] = useState(false);
    const createFormRef = useRef<HTMLDivElement>(null);

    function abrirFormularioCriar() {
        setShowCreate(true);
        // scroll suave até o form no próximo frame (depois do render)
        requestAnimationFrame(() => {
            createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            const firstInput = createFormRef.current?.querySelector<HTMLInputElement>("input, select, textarea");
            firstInput?.focus({ preventScroll: true });
        });
    }

    useEffect(() => {
        if (searchParams.get("criar") === "1") {
            abrirFormularioCriar();
            const next = new URLSearchParams(searchParams);
            next.delete("criar");
            setSearchParams(next, { replace: true });
        }
        // eslint-disable-next-line
    }, []);

    function setCreateField<K extends keyof CriarEquipeBody>(k: K, v: CriarEquipeBody[K]) {
        setCreate((p) => ({ ...p, [k]: v }));
    }

    async function handleCriarEquipe() {
        const payload: CriarEquipeBody = {
            nome: normalizeStr(create.nome),
            cepOuLocal: normalizeStr(create.cepOuLocal),
            esporte: create.esporte,
            statusEquipe: create.statusEquipe,
            diasHorariosPadrao: diasHorariosPadraoStr,
        };
        if (!payload.nome) return toast.warn("Nome da equipe é obrigatório.");
        if (!payload.cepOuLocal) return toast.warn("CEP é obrigatório.");
        if (!/^\d{8}$/.test(payload.cepOuLocal)) return toast.warn("CEP deve ter 8 dígitos.");
        if (!payload.diasHorariosPadrao) return toast.warn("Habilite ao menos um dia na agenda padrão.");
        if (payload.statusEquipe === "FECHADA") {
            const s = normalizeStr(create.senhaEquipe ?? "");
            if (!s) return toast.warn("Equipe fechada precisa de uma senha.");
            payload.senhaEquipe = s;
        }
        try {
            setCreating(true);
            const created = await criarEquipe(payload);
            toast.success(`Equipe "${created.nome}" criada.`);
            await loadMinhasEquipes();
            nav(`/equipes/${created.id}`);
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha ao criar equipe");
        } finally { setCreating(false); }
    }

    const [q, setQ] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchedOnce, setSearchedOnce] = useState(false);
    const [results, setResults] = useState<EquipeResumo[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detalhe, setDetalhe] = useState<EquipeDetalhe | null>(null);
    const [joining, setJoining] = useState(false);
    const [senhaEntrada, setSenhaEntrada] = useState("");

    const [pertoDeMim, setPertoDeMim] = useState(false);
    const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);

    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    async function ativarPertoDeMim() {
        if (!("geolocation" in navigator)) {
            toast.warn("Seu navegador não suporta geolocalização.");
            return;
        }
        setLocating(true);
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 5 * 60 * 1000,
                });
            });
            setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setPertoDeMim(true);
        } catch (err: any) {
            if (err?.code === 1) toast.warn("Permissão de localização negada.");
            else toast.warn("Não foi possível obter sua localização.");
            setPertoDeMim(false);
            setGeo(null);
        } finally {
            setLocating(false);
        }
    }

    function desativarPertoDeMim() {
        setPertoDeMim(false);
    }

    async function handleBuscar(termo: string = q, pageArg: number = page) {
        const qq = normalizeStr(termo);
        try {
            setSearching(true);
            setSearchedOnce(true);
            const res = await buscarEquipes(qq, {
                ...(pertoDeMim && geo ? { lat: geo.lat, lng: geo.lng } : {}),
                page: pageArg,
                pageSize: PAGE_SIZE,
            });
            setResults(res.items ?? []);
            setTotal(res.total ?? 0);
            setTotalPages(Math.max(1, res.totalPages ?? 1));
            if (!res.items?.length) { setSelectedId(null); setDetalhe(null); }
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha na busca");
        } finally { setSearching(false); }
    }

    // reseta pagina quando muda termo de busca ou filtro
    useEffect(() => {
        setPage(1);
    }, [q, pertoDeMim, geo]);

    // debounce: busca 400ms depois que parou de digitar / mudar filtro / mudar pagina
    useEffect(() => {
        const t = setTimeout(() => { handleBuscar(q, page); }, 400);
        return () => clearTimeout(t);
        /* eslint-disable-next-line */
    }, [q, pertoDeMim, geo, page]);

    async function openDetalhe(id: string) {
        setSelectedId(id);
        try {
            const d = await getEquipe(id);
            setDetalhe(d);
            setSenhaEntrada("");
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e));
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
        try {
            setJoining(true);
            if (statusEquipe === "ABERTA") {
                await entrarEquipeAberta(selectedId);
                toast.success("Você entrou na equipe.");
                nav(`/equipes/${selectedId}`);
                return;
            }
            const s = normalizeStr(senhaEntrada);
            if (!s) { toast.warn("Informe a senha da equipe."); return; }
            await entrarEquipeFechada(selectedId, s);
            toast.success("Você entrou na equipe.");
            nav(`/equipes/${selectedId}`);
        } catch (e: any) {
            if (isAuthError(e)) return;
            toast.error(explainError(e), "Falha ao entrar");
        }
        finally { setJoining(false); }
    }

    return (
        <div className="x-app">
            <AppHeader />

            <main className="x-app-main">
                <div className="x-app-container">
                    <div className="x-banner x-reveal">
                        <img src="/volei-praia.jpg" alt="" />
                        <div className="x-banner-content">
                            <div className="x-eyebrow">Seu clube, suas regras</div>
                            <h1 className="x-banner-title">
                                Encontre, crie,<br /><em>jogue</em>.
                            </h1>
                            <p className="x-banner-sub">
                                Monte uma equipe nova ou participe de uma existente. Controle de presença,
                                sorteio nivelado e convite por link — tudo pronto.
                            </p>
                        </div>
                    </div>

                    <div className="x-page-head">
                        <div>
                            <h2 className="x-h3">Suas equipes</h2>
                            <p className="x-page-sub">Participe de rachões ou crie o seu próprio clube.</p>
                        </div>
                        <button
                            className="x-btn"
                            onClick={() => (showCreate ? setShowCreate(false) : abrirFormularioCriar())}
                        >
                            {showCreate ? "Fechar" : "Nova equipe"} {!showCreate && <span className="x-btn-arr">+</span>}
                        </button>
                    </div>

                    {bootLoading && (
                        <div className="x-loading"><div className="x-spinner" /> Carregando suas equipes...</div>
                    )}

                    {/* CRIAR equipe (collapsible) */}
                    {showCreate && (
                        <div ref={createFormRef} className="x-card pad-lg" style={{ marginBottom: 32, scrollMarginTop: 80 }}>
                            <div className="x-card-title">Criar equipe</div>
                            <hr className="x-divider" />

                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div className="x-field">
                                    <label>Nome da equipe</label>
                                    <input
                                        className="x-input"
                                        placeholder="Rachão do Guilherme"
                                        value={create.nome}
                                        onChange={(e) => setCreateField("nome", e.target.value)}
                                    />
                                </div>

                                <div className="x-field">
                                    <label>CEP</label>
                                    <input
                                        className="x-input"
                                        placeholder="00000-000"
                                        inputMode="numeric"
                                        autoComplete="postal-code"
                                        value={maskCepOuLocal(create.cepOuLocal)}
                                        onChange={(e) => {
                                            setCreateField("cepOuLocal", e.target.value.replace(/\D/g, "").slice(0, 8));
                                        }}
                                    />
                                </div>

                                <div className="x-form-grid">
                                    <div className="x-field">
                                        <label>Esporte</label>
                                        <select
                                            className="x-select"
                                            value={create.esporte}
                                            onChange={(e) => setCreateField("esporte", e.target.value as Esporte)}
                                        >
                                            <option value="VOLEI">Vôlei</option>
                                            <option value="FUTEVOLEI">Futevôlei</option>
                                        </select>
                                    </div>
                                    <div className="x-field">
                                        <label>Status</label>
                                        <select
                                            className="x-select"
                                            value={create.statusEquipe}
                                            onChange={(e) => setCreateField("statusEquipe", e.target.value as StatusEquipe)}
                                        >
                                            <option value="ABERTA">Aberta</option>
                                            <option value="FECHADA">Fechada (com senha)</option>
                                        </select>
                                    </div>
                                </div>

                                {showSenha && (
                                    <div className="x-field">
                                        <label>Senha da equipe</label>
                                        <input
                                            className="x-input x-masked"
                                            type="text"
                                            name="team-passcode"
                                            autoComplete="off"
                                            autoCorrect="off"
                                            autoCapitalize="none"
                                            spellCheck={false}
                                            data-lpignore="true"
                                            data-1p-ignore="true"
                                            data-bwignore="true"
                                            data-form-type="other"
                                            placeholder="Defina uma senha"
                                            value={create.senhaEquipe ?? ""}
                                            onChange={(e) => setCreateField("senhaEquipe", e.target.value)}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="x-label" style={{ display: "block", marginBottom: 10 }}>
                                        Agenda padrão
                                    </label>
                                    <div className="x-agenda">
                                        {DIAS.map((d) => {
                                            const item = agenda[d.key];
                                            return (
                                                <div key={d.key} className={`x-agenda-row ${item.enabled ? "on" : ""}`}>
                                                    <label className="x-agenda-day">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.enabled}
                                                            onChange={(e) => {
                                                                const enabled = e.target.checked;
                                                                setAgenda((prev) => ({ ...prev, [d.key]: { ...prev[d.key], enabled } }));
                                                            }}
                                                        />
                                                        <span>{d.label}</span>
                                                    </label>
                                                    <input
                                                        type="time"
                                                        className="x-agenda-time"
                                                        value={item.time}
                                                        disabled={!item.enabled}
                                                        onChange={(e) => {
                                                            const time = e.target.value;
                                                            setAgenda((prev) => ({ ...prev, [d.key]: { ...prev[d.key], time } }));
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: 10 }}>
                                    <button className="x-btn" onClick={handleCriarEquipe} disabled={creating}>
                                        {creating ? "Criando..." : "Criar equipe"}
                                    </button>
                                    <button className="x-btn ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Minhas equipes */}
                    {minhasEquipes.length > 0 && (
                        <div style={{ marginBottom: 40 }}>
                            <div className="x-page-head" style={{ marginBottom: 20 }}>
                                <div>
                                    <h2 className="x-h3">Minhas equipes</h2>
                                </div>
                                <span className="x-pill">{minhasEquipes.length}</span>
                            </div>
                            <div className="x-list">
                                {minhasEquipes.map((r) => (
                                    <button key={r.id} className="x-list-item" onClick={() => nav(`/equipes/${r.id}`)}>
                                        <div className="x-avatar sm">{r.nome.charAt(0).toUpperCase()}</div>
                                        <div className="x-list-item-main">
                                            <div className="x-list-item-title">{r.nome}</div>
                                            <div className="x-list-item-sub">
                                                <span>{r.esporte}</span>
                                                <span className="sep">·</span>
                                                <span>{r.statusEquipe}</span>
                                                <span className="sep">·</span>
                                                <span>{r.cepOuLocal}</span>
                                            </div>
                                        </div>
                                        <div className="x-list-item-right">
                                            <span className="x-chev">→</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Buscar */}
                    <div>
                        <div className="x-page-head" style={{ marginBottom: 20 }}>
                            <div>
                                <h2 className="x-h3">Descobrir equipes</h2>
                                <p className="x-page-sub">Encontre equipes abertas para participar.</p>
                            </div>
                            <span className="x-pill">{results.length}</span>
                        </div>

                        <div className="x-search">
                            <span className="x-search-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="7" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </span>
                            <input
                                className="x-input"
                                placeholder="Buscar equipe por nome..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {searching && (
                                <span className="x-search-spinner" aria-hidden>
                                    <span className="x-search-spinner-dot" />
                                </span>
                            )}
                            {!searching && q && (
                                <button
                                    type="button"
                                    className="x-search-clear"
                                    onClick={() => setQ("")}
                                    aria-label="Limpar busca"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <button
                                type="button"
                                className={`x-btn sm ${pertoDeMim ? "" : "ghost"}`}
                                onClick={pertoDeMim ? desativarPertoDeMim : ativarPertoDeMim}
                                disabled={locating}
                                title={pertoDeMim ? "Desativar filtro" : "Filtrar equipes próximas"}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "-2px" }}>
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                {locating ? "Localizando..." : (pertoDeMim ? "Perto de mim ✓" : "Perto de mim")}
                            </button>
                            {pertoDeMim && geo && (
                                <span className="x-meta" style={{ fontSize: 12 }}>
                                    Ordenando por proximidade
                                </span>
                            )}
                        </div>

                        {results.length === 0 ? (
                            <div className="x-empty">
                                <div className="x-empty-icon">
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                                <h3 className="x-empty-title">Nada encontrado</h3>
                                <p className="x-empty-text">
                                    {searchedOnce
                                        ? (q.trim()
                                            ? `Nenhuma equipe com o termo "${q}".`
                                            : "Nenhuma equipe pública disponível no momento. Que tal criar a sua?")
                                        : "Carregando..."}
                                </p>
                                {!q.trim() && searchedOnce && (
                                    <button className="x-btn sm" onClick={abrirFormularioCriar}>
                                        Criar equipe <span className="x-btn-arr">+</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="x-list">
                                {results.map((r) => (
                                    <button
                                        key={r.id}
                                        className="x-list-item"
                                        onClick={() => openDetalhe(String(r.id))}
                                        style={String(selectedId) === String(r.id) ? { borderColor: "var(--x-accent)" } : undefined}
                                    >
                                        <div className="x-avatar sm teal">{r.nome.charAt(0).toUpperCase()}</div>
                                        <div className="x-list-item-main">
                                            <div className="x-list-item-title">{r.nome}</div>
                                            <div className="x-list-item-sub">
                                                <span>{r.esporte}</span>
                                                <span className="sep">·</span>
                                                <span>{r.statusEquipe}</span>
                                                <span className="sep">·</span>
                                                <span>{r.cepOuLocal}</span>
                                            </div>
                                        </div>
                                        <div className="x-list-item-right">
                                            <span className="x-chev">→</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {results.length > 0 && totalPages > 1 && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                                <span className="x-meta" style={{ fontSize: 12 }}>
                                    Página {page} de {totalPages}{total ? ` · ${total} resultado${total === 1 ? "" : "s"}` : ""}
                                </span>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                        type="button"
                                        className="x-btn ghost sm"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={searching || page <= 1}
                                    >
                                        ← Anterior
                                    </button>
                                    <button
                                        type="button"
                                        className="x-btn ghost sm"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={searching || page >= totalPages}
                                    >
                                        Próxima →
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedId && (
                            <div className="x-card" style={{ marginTop: 20 }}>
                                <div className="x-card-title">
                                    Entrar na equipe
                                    <span className="x-pill">{statusEquipe ?? "—"}</span>
                                </div>
                                <hr className="x-divider" />

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <button className="x-btn ghost" onClick={() => nav(`/equipes/${selectedId}`)}>
                                        Ver detalhes
                                    </button>

                                    {statusEquipe === "FECHADA" && (
                                        <input
                                            className="x-input x-masked"
                                            type="text"
                                            name="team-passcode"
                                            autoComplete="off"
                                            autoCorrect="off"
                                            autoCapitalize="none"
                                            spellCheck={false}
                                            data-lpignore="true"
                                            data-1p-ignore="true"
                                            data-bwignore="true"
                                            data-form-type="other"
                                            placeholder="Senha da equipe"
                                            value={senhaEntrada}
                                            onChange={(e) => setSenhaEntrada(e.target.value)}
                                            style={{ flex: 1, minWidth: 200 }}
                                        />
                                    )}

                                    <button className="x-btn" onClick={handleEntrar} disabled={joining}>
                                        {joining ? "Entrando..." : "Entrar"} <span className="x-btn-arr">→</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
