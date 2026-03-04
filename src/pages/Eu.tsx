// src/pages/EuPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

type EuResponse = {
    id: number;
    nome: string;
    telefone: string;
    cep: string;
    peso: number;
    altura: number;
    notaVolei: number;
    notaFutevolei: number;
    criadoEm: string;
};

type MinhaEquipeResumo = {
    id: number;
    nome: string;
    esporte: "VOLEI" | "FUTEBOL" | "FUTEVOLEI" | string;
    statusEquipe: "ABERTA" | "FECHADA" | string;
    totalMembros: number;
};

function explainAxiosError(e: any) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    if (status) return `Erro (HTTP ${status}): ${JSON.stringify(data)}`;
    return "Falha de rede / backend offline.";
}

function toNumOrNull(v: string) {
    const t = (v ?? "").trim();
    if (!t) return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function normStrToStr(v: any) {
    return (v ?? "").toString().trim();
}

function normNumOrNull(v: any) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function fmtISO(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR");
}

export default function EuPage() {
    const nav = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const [data, setData] = useState<EuResponse | null>(null);

    const [equipesMembro, setEquipesMembro] = useState<MinhaEquipeResumo[]>([]);
    const [equipesAdmin, setEquipesAdmin] = useState<MinhaEquipeResumo[]>([]);

    const [telefone, setTelefone] = useState("");
    const [cep, setCep] = useState("");
    const [peso, setPeso] = useState("");
    const [altura, setAltura] = useState("");
    const [notaVolei, setNotaVolei] = useState("");
    const [notaFutevolei, setNotaFutevolei] = useState("");

    const originalRef = useRef<{
        telefone: string;
        cep: string;
        peso: number | null;
        altura: number | null;
        notaVolei: number | null;
        notaFutevolei: number | null;
    } | null>(null);

    async function load() {
        setErr(null);
        setOk(null);
        setLoading(true);

        try {
            const [meRes, membroRes, adminRes] = await Promise.all([
                api.get<EuResponse>("/eu"),
                api.get<MinhaEquipeResumo[]>("/eu/equipes"),
                api.get<MinhaEquipeResumo[]>("/eu/equipes-administrador"),
            ]);

            const d = meRes.data;
            setData(d);

            setEquipesMembro(membroRes.data ?? []);
            setEquipesAdmin(adminRes.data ?? []);

            const o = {
                telefone: normStrToStr(d.telefone),
                cep: normStrToStr(d.cep),
                peso: normNumOrNull(d.peso),
                altura: normNumOrNull(d.altura),
                notaVolei: normNumOrNull(d.notaVolei),
                notaFutevolei: normNumOrNull(d.notaFutevolei),
            };

            originalRef.current = o;

            setTelefone(o.telefone);
            setCep(o.cep);
            setPeso(o.peso === null ? "" : String(o.peso));
            setAltura(o.altura === null ? "" : String(o.altura));
            setNotaVolei(o.notaVolei === null ? "" : String(o.notaVolei));
            setNotaFutevolei(o.notaFutevolei === null ? "" : String(o.notaFutevolei));
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
        load();
    }, []);

    const initials = useMemo(() => {
        const n = (data?.nome ?? "").trim();
        if (!n) return "EU";

        const parts = n.split(/\s+/).filter(Boolean);
        const a = parts[0]?.[0] ?? "E";
        const b = parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "U";

        return (a + b).toUpperCase();
    }, [data?.nome]);

    const normalized = useMemo(() => {
        return {
            telefone: normStrToStr(telefone),
            cep: normStrToStr(cep),
            peso: peso.trim() ? toNumOrNull(peso) : null,
            altura: altura.trim() ? toNumOrNull(altura) : null,
            notaVolei: notaVolei.trim() ? toNumOrNull(notaVolei) : null,
            notaFutevolei: notaFutevolei.trim() ? toNumOrNull(notaFutevolei) : null,
        };
    }, [telefone, cep, peso, altura, notaVolei, notaFutevolei]);

    const hasChanges = useMemo(() => {
        const o = originalRef.current;
        if (!o) return false;

        return (
            o.telefone !== normalized.telefone ||
            o.cep !== normalized.cep ||
            o.peso !== normalized.peso ||
            o.altura !== normalized.altura ||
            o.notaVolei !== normalized.notaVolei ||
            o.notaFutevolei !== normalized.notaFutevolei
        );
    }, [normalized]);

    async function onSalvar() {
        setErr(null);
        setOk(null);

        const o = originalRef.current;
        if (!o) return;

        if (!hasChanges) {
            setOk("Nada para salvar.");
            return;
        }

        const patch: any = {};

        if (o.telefone !== normalized.telefone) patch.telefone = normalized.telefone;
        if (o.cep !== normalized.cep) patch.cep = normalized.cep;
        if (o.peso !== normalized.peso) patch.peso = normalized.peso ?? 0;
        if (o.altura !== normalized.altura) patch.altura = normalized.altura ?? 0;
        if (o.notaVolei !== normalized.notaVolei) patch.notaVolei = normalized.notaVolei ?? 0;
        if (o.notaFutevolei !== normalized.notaFutevolei) patch.notaFutevolei = normalized.notaFutevolei ?? 0;

        try {
            setSaving(true);
            await api.patch("/eu", patch);
            setOk("Perfil atualizado.");
            await load();
        } catch (e: any) {
            setErr(explainAxiosError(e));
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="euLoading">Carregando perfil...</div>;

    if (!data) return null;

    return (
        <div className="euShell">
            <div className="euPanel">

                {/* NAVBAR SUPERIOR */}

                <div className="euTopBar">
                    <div className="euTopTitle">Meu perfil</div>

                    <div className="euNavGroup">
                        <button
                            className="euNavLink"
                            onClick={() => nav("/equipes")}
                        >
                            Equipes
                        </button>

                        <button
                            className="euNavLink active"
                        >
                            Perfil
                        </button>
                    </div>
                </div>

                {/* HEADER PERFIL */}

                <div className="euHeader">
                    <div className="euAvatarWrap">
                        <div className="euAvatarFallback">
                            {initials}
                        </div>
                    </div>

                    <div className="euName">
                        {data.nome}
                    </div>

                    <div className="euSub">
                        {data.telefone}
                    </div>
                </div>

                {(ok || err) && (
                    <div className={`euMsg ${ok ? "ok" : "err"}`}>
                        {ok ?? err}
                    </div>
                )}

                <div className="euBody">

                    {/* CONTA */}

                    <section className="euCard">

                        <div className="euCardTitle">
                            Conta
                        </div>

                        <div className="euRow">
                            <span>ID</span>
                            <strong>{data.id}</strong>
                        </div>

                        <div className="euRow">
                            <span>Criado em</span>
                            <strong>{fmtISO(data.criadoEm)}</strong>
                        </div>

                    </section>

                    {/* PERFIL */}

                    <section className="euCard">

                        <div className="euCardTitle">
                            Dados do perfil
                        </div>

                        <div className="euFormGrid">

                            <label className="euLabel">
                                Telefone
                                <input
                                    className="euInput"
                                    value={telefone}
                                    onChange={(e) => setTelefone(e.target.value)}
                                />
                            </label>

                            <label className="euLabel">
                                CEP
                                <input
                                    className="euInput"
                                    value={cep}
                                    onChange={(e) => setCep(e.target.value)}
                                />
                            </label>

                            <label className="euLabel">
                                Peso
                                <input
                                    className="euInput"
                                    value={peso}
                                    onChange={(e) => setPeso(e.target.value)}
                                />
                            </label>

                            <label className="euLabel">
                                Altura
                                <input
                                    className="euInput"
                                    value={altura}
                                    onChange={(e) => setAltura(e.target.value)}
                                />
                            </label>

                            <label className="euLabel">
                                Nota Vôlei
                                <input
                                    className="euInput"
                                    value={notaVolei}
                                    onChange={(e) => setNotaVolei(e.target.value)}
                                />
                            </label>

                            <label className="euLabel">
                                Nota Futevôlei
                                <input
                                    className="euInput"
                                    value={notaFutevolei}
                                    onChange={(e) => setNotaFutevolei(e.target.value)}
                                />
                            </label>

                        </div>

                        <button
                            className="euBtn primary"
                            onClick={onSalvar}
                            disabled={!hasChanges || saving}
                        >
                            {saving ? "Salvando..." : "Salvar alterações"}
                        </button>

                    </section>

                    {/* ADMIN */}

                    <section className="euCard">

                        <div className="euCardTitle">
                            Sou administrador
                        </div>

                        {equipesAdmin.length === 0 ? (
                            <div className="euEmpty">
                                Você não administra equipes.
                            </div>
                        ) : (
                            <div className="euTeamList">

                                {equipesAdmin.map((t) => (

                                    <button
                                        key={t.id}
                                        className="euTeamItem"
                                        onClick={() => nav(`/equipes/${t.id}`)}
                                    >

                                        <div className="euTeamLeft">

                                            <div className="euTeamName">
                                                {t.nome}
                                            </div>

                                            <div className="euTeamMeta">
                                                {t.esporte} • {t.statusEquipe} • {t.totalMembros} membros
                                            </div>

                                        </div>

                                        <div className="euTeamBadge admin">
                                            ADMIN
                                        </div>

                                    </button>

                                ))}

                            </div>
                        )}

                    </section>

                    {/* MEMBRO */}

                    <section className="euCard">

                        <div className="euCardTitle">
                            Minhas equipes
                        </div>

                        {equipesMembro.length === 0 ? (
                            <div className="euEmpty">
                                Você não participa de equipes.
                            </div>
                        ) : (
                            <div className="euTeamList">

                                {equipesMembro.map((t) => (

                                    <button
                                        key={t.id}
                                        className="euTeamItem"
                                        onClick={() => nav(`/equipes/${t.id}`)}
                                    >

                                        <div className="euTeamLeft">

                                            <div className="euTeamName">
                                                {t.nome}
                                            </div>

                                            <div className="euTeamMeta">
                                                {t.esporte} • {t.statusEquipe} • {t.totalMembros} membros
                                            </div>

                                        </div>

                                        <div className="euTeamBadge">
                                            VER
                                        </div>

                                    </button>

                                ))}

                            </div>
                        )}

                    </section>

                </div>

            </div>
        </div>
    );
}