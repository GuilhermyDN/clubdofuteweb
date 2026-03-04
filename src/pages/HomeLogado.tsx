// src/pages/HomeLogado.tsx
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
  trocarSenhaEquipe,
} from "../services/equipe";

import "../styles/HomeLogado.css";

function normalizeStr(v: string) {
  return v.trim();
}

type Chip = "DISTANCIA" | "PRECO_1" | "PRECO_2" | "PRECO_3";

export default function HomeLogado() {
  const nav = useNavigate();

  // ====== GATE: MINHAS EQUIPES ======
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

      // token inválido / expirado
      if (status === 401 || status === 403) {
        nav("/login");
        return;
      }

      const data = e?.response?.data;
      setBootErr(
        status
          ? `Erro (HTTP ${status}): ${JSON.stringify(data)}`
          : "Falha de rede / CORS / backend fora."
      );
    } finally {
      setBootLoading(false);
    }
  }

  useEffect(() => {
    loadMinhasEquipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const temEquipe = minhasEquipes.length > 0;

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

  // ====== BUSCAR/ENTRAR ======
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<EquipeResumo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<EquipeDetalhe | null>(null);

  const [joining, setJoining] = useState(false);
  const [senhaEntrada, setSenhaEntrada] = useState("");

  // ====== ADMIN: trocar senha ======
  // Enquanto o backend não devolve meuPapel=ADMIN com segurança, fica toggle manual
  const [souAdmin, setSouAdmin] = useState(false);
  const [novaSenhaEquipe, setNovaSenhaEquipe] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  // ====== FEEDBACK ======
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      setErr(
        status
          ? `Erro (HTTP ${status}): ${JSON.stringify(data)}`
          : "Falha de rede / CORS / backend fora."
      );
    } finally {
      setCreating(false);
    }
  }

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
      setResults(list);
      setSelectedId(null);
      setDetalhe(null);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      setErr(
        status
          ? `Erro (HTTP ${status}): ${JSON.stringify(data)}`
          : "Falha de rede / CORS / backend fora."
      );
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
      // setSouAdmin(d.meuPapel === "ADMIN");
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      setErr(
        status
          ? `Erro (HTTP ${status}): ${JSON.stringify(data)}`
          : "Falha de rede / CORS / backend fora."
      );
    }
  }

  const selectedResumo = useMemo(
    () => results.find((r) => r.id === selectedId) ?? null,
    [results, selectedId]
  );

  const statusEquipe: StatusEquipe | null =
    (detalhe?.statusEquipe ?? selectedResumo?.statusEquipe) ?? null;

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
        return;
      }

      // FECHADA
      const s = normalizeStr(senhaEntrada);
      if (!s) {
        setErr("Equipe FECHADA: informe a senha.");
        return;
      }

      await entrarEquipeFechada(selectedId, s);
      setOk("Entrou na equipe.");
      await loadMinhasEquipes();
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      setErr(
        status
          ? `Erro (HTTP ${status}): ${JSON.stringify(data)}`
          : "Falha de rede / CORS / backend fora."
      );
    } finally {
      setJoining(false);
    }
  }

  async function handleTrocarSenha() {
    if (!selectedId) return;
    setErr(null);
    setOk(null);

    const ns = normalizeStr(novaSenhaEquipe);
    if (!ns) return setErr("Informe a nova senha.");

    try {
      setChangingPass(true);
      await trocarSenhaEquipe(selectedId, ns);
      setOk("Senha da equipe atualizada.");
      setNovaSenhaEquipe("");
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      setErr(
        status
          ? `Erro (HTTP ${status}): ${JSON.stringify(data)}`
          : "Falha de rede / CORS / backend fora."
      );
    } finally {
      setChangingPass(false);
    }
  }

  // ====== UI "igual a imagem" (adaptada pra web) ======
  const [chip, setChip] = useState<Chip>("DISTANCIA");

  function chipLabel(c: Chip) {
    if (c === "DISTANCIA") return "Distância";
    if (c === "PRECO_1") return "R$100,00";
    if (c === "PRECO_2") return "R$110,00";
    return "R$170,0";
  }

  // Por enquanto não existe preço/distância no backend => não filtra de verdade.
  const equipesFiltradas = useMemo(() => {
    return minhasEquipes;
  }, [minhasEquipes]);

  const quadraImg = "/quadra.png";

  // Quando tiver q preenchida + results, mostra results; senão mostra minhas equipes.
  const listaCards = useMemo(() => {
    const qq = q.trim();
    if (qq && results.length > 0) return results;
    if (qq && results.length === 0) return []; // buscou e não achou
    return equipesFiltradas;
  }, [q, results, equipesFiltradas]);

  return (
    <main className="hlPage">
      {bootLoading ? (
        <section className="hlContent">
          <div className="hlMsg">Carregando suas equipes...</div>
        </section>
      ) : bootErr ? (
        <section className="hlContent">
          <div className="hlMsg err">{bootErr}</div>
          <button className="hlProfileBtn" type="button" onClick={loadMinhasEquipes}>
            Tentar novamente
          </button>
        </section>
      ) : temEquipe ? (
        <>
          {/* TOP (search + chips) */}
          <header className="hlAppTop">
            <div className="hlTopRow">
              <div className="hlBrand">ClubeDoFut</div>
              <button
                className="hlProfileBtn"
                type="button"
                onClick={() => nav("/eu")}
              >
                Perfil
              </button>
            </div>

            <div className="hlSearch">
              <input
                className="hlSearchInput"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar equipe, local, CEP..."
              />
              <button
                className="hlSearchBtn"
                type="button"
                onClick={handleBuscar}
                disabled={searching}
              >
                {searching ? "..." : "Buscar"}
              </button>
            </div>

            <div className="hlChips">
              {(["DISTANCIA", "PRECO_1", "PRECO_2", "PRECO_3"] as const).map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    className={`hlChip ${chip === c ? "active" : ""}`}
                    onClick={() => setChip(c)}
                  >
                    {chipLabel(c)}
                  </button>
                )
              )}
            </div>
          </header>

          {/* LISTA */}
          <section className="hlContent">
            <div className="hlSectionTitle">
              Criando liga por {chipLabel(chip)}
            </div>

            <div className="hlCards">
              {q.trim() && results.length === 0 ? (
                <div className="hlEmpty">Nenhum resultado.</div>
              ) : (
                listaCards.map((r) => (
                  <article
                    key={r.id}
                    className="hlCardGame"
                    onClick={() => nav(`/equipes/${r.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        nav(`/equipes/${r.id}`);
                      }
                    }}
                  >
                    <div className="hlCardImg">
                      <img src="/quadra.png" alt="Quadra" />
                    </div>

                    <div className="hlCardBody">
                      <div className="hlCardTitle">{r.nome}</div>

                      <div className="hlCardSub">
                        {r.esporte} • {r.cepOuLocal} • {r.statusEquipe}
                      </div>

                      <div className="hlCardRow">
                        <div className="hlPrice">
                          <span>R$ 50,00</span>
                          <strong>R$ 50,00</strong>
                        </div>

                        <button
                          className="hlPlayBtn"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // evita duplicar navegação
                            nav(`/equipes/${r.id}`);
                          }}
                        >
                          Jogar
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* BOTTOM NAV */}
          <nav className="hlBottomNav">
            <div className="hlBottomNavInner">
              <button
                type="button"
                className="hlNavItem active"
                onClick={() => nav("/home-logado")}
              >
                Home
              </button>
              <button
                type="button"
                className="hlNavItem"
                onClick={() => nav("/habilidades")}
              >
                Habilidades
              </button>
              <button
                type="button"
                className="hlNavItem"
                onClick={() => nav("/solicitacoes")}
              >
                Solicitações
              </button>
              <button
                type="button"
                className="hlNavItem"
                onClick={() => nav("/equipes")}
              >
                Equipes
              </button>
            </div>
          </nav>
        </>
      ) : (
        <>
          {/* ====== ONBOARDING (sem equipe) ====== */}
          <header className="hlTop">
            <div className="hlTopInner">
              <div className="hlTitleRow">
                <div className="hlTitleWithIcon">
                  <div className="hlHeroIcon">
                    <img
                      className="hlHeroIconImg"
                      src="/find-team.png"
                      alt="Encontrar equipe"
                    />
                  </div>

                  <div>
                    <div className="hlTitle">Encontre uma equipe.</div>
                    <div className="hlSub">
                      Para entrar em uma equipe, busque pelo nome, local ou CEP.
                    </div>
                  </div>
                </div>

                <button
                  className="hlProfileBtn"
                  type="button"
                  onClick={() => nav("/eu")}
                >
                  Meu perfil
                </button>
              </div>
            </div>
          </header>

          <section className="hlContent">
            <div className="hlWrap">
              {(ok || err) && (
                <div className={`hlMsg ${ok ? "ok" : "err"}`}>{ok ?? err}</div>
              )}

              <div className="hlGrid">
                {/* ===== CRIAR EQUIPE ===== */}
                <section className="hlCard">
                  <div className="hlCardTitle">Criar equipe</div>

                  <div className="hlForm">
                    <label className="hlLabel">
                      <span>Nome</span>
                      <input
                        className="hlInput"
                        value={create.nome}
                        onChange={(e) => setCreateField("nome", e.target.value)}
                      />
                    </label>

                    <label className="hlLabel">
                      <span>CEP ou Local</span>
                      <input
                        className="hlInput"
                        value={create.cepOuLocal}
                        onChange={(e) =>
                          setCreateField("cepOuLocal", e.target.value)
                        }
                      />
                    </label>

                    <div className="hlRow2">
                      <label className="hlLabel">
                        <span>Esporte</span>
                        <select
                          className="hlSelect"
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

                      <label className="hlLabel">
                        <span>Status</span>
                        <select
                          className="hlSelect"
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
                      <label className="hlLabel">
                        <span>Senha da equipe (somente FECHADA)</span>
                        <input
                          className="hlInput"
                          value={create.senhaEquipe ?? ""}
                          onChange={(e) =>
                            setCreateField("senhaEquipe", e.target.value)
                          }
                        />
                      </label>
                    )}

                    <label className="hlLabel">
                      <span>Dias/Horários padrão</span>
                      <input
                        className="hlInput"
                        value={create.diasHorariosPadrao}
                        onChange={(e) =>
                          setCreateField("diasHorariosPadrao", e.target.value)
                        }
                        placeholder="Ex.: Sábados às 9h"
                      />
                    </label>

                    <button
                      className="hlBtn primary"
                      type="button"
                      onClick={handleCriarEquipe}
                      disabled={creating}
                    >
                      {creating ? "Criando..." : "Criar equipe"}
                    </button>
                  </div>
                </section>

                {/* ===== ENTRAR EM EQUIPE ===== */}
                <section className="hlCard">
                  <div className="hlCardTitle">Entrar em equipe</div>

                  <div className="hlForm">
                    <label className="hlLabel">
                      <span>Buscar equipe</span>
                      <div className="hlSearchRow">
                        <input
                          className="hlInput"
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Nome, local, CEP..."
                        />
                        <button
                          className="hlBtn"
                          type="button"
                          onClick={handleBuscar}
                          disabled={searching}
                        >
                          {searching ? "..." : "Buscar"}
                        </button>
                      </div>
                    </label>

                    <div className="hlList">
                      {results.length === 0 ? (
                        <div className="hlEmpty">Nenhum resultado.</div>
                      ) : (
                        results.map((r) => (
                          <button
                            key={r.id}
                            className={`hlItem ${selectedId === r.id ? "active" : ""
                              }`}
                            type="button"
                            onClick={() => openDetalhe(r.id)}
                          >
                            <div className="hlItemTitle">{r.nome}</div>
                            <div className="hlItemSub">
                              {r.esporte} • {r.statusEquipe} • {r.cepOuLocal}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {selectedId && (
                      <div className="hlDetails">
                        <div className="hlDetailsTitle">Detalhes</div>
                        <div className="hlDetailsRow">
                          <span>Status</span>
                          <strong>{statusEquipe ?? "—"}</strong>
                        </div>

                        {statusEquipe === "FECHADA" && (
                          <label className="hlLabel">
                            <span>Senha para entrar</span>
                            <input
                              className="hlInput"
                              value={senhaEntrada}
                              onChange={(e) => setSenhaEntrada(e.target.value)}
                            />
                          </label>
                        )}

                        <button
                          className="hlBtn primary"
                          type="button"
                          onClick={handleEntrar}
                          disabled={joining}
                        >
                          {joining ? "Entrando..." : "Entrar"}
                        </button>

                        <div className="hlAdminBox">
                          <label className="hlCheck">
                            <input
                              type="checkbox"
                              checked={souAdmin}
                              onChange={(e) => setSouAdmin(e.target.checked)}
                            />
                            Sou admin desta equipe
                          </label>

                          {souAdmin && (
                            <>
                              <label className="hlLabel">
                                <span>Nova senha da equipe</span>
                                <input
                                  className="hlInput"
                                  value={novaSenhaEquipe}
                                  onChange={(e) =>
                                    setNovaSenhaEquipe(e.target.value)
                                  }
                                />
                              </label>
                              <button
                                className="hlBtn"
                                type="button"
                                onClick={handleTrocarSenha}
                                disabled={changingPass}
                              >
                                {changingPass ? "..." : "Trocar senha"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}