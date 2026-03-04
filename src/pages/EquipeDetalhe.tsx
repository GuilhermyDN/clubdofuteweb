import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEquipe } from "../services/equipe";
import type { EquipeDetalhe } from "../services/equipe";
import { getEu } from "../services/eu";
import { promoverAdmin, rebaixarMembro, removerMembro } from "../services/membrosEquipe";

function fmtISOToBR(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR");
}

function isAdminRole(papel?: string) {
  return papel === "ADMIN" || papel === "ADMINISTRADOR";
}

type ConfirmKind = "PROMOVER" | "REBAIXAR";
type ConfirmState = {
  open: boolean;
  kind: ConfirmKind;
  targetUsuarioId: number | null;
  targetNome: string | null;
  targetPapel: string | null;
};

type RemoveConfirmState = {
  open: boolean;
  usuarioId: number | null;
  nome: string | null;
};

export default function EquipeDetalhePage() {
  const nav = useNavigate();
  const { equipeId } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [data, setData] = useState<EquipeDetalhe | null>(null);

  const [euId, setEuId] = useState<number | null>(null);
  const [souAdmin, setSouAdmin] = useState(false);

  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    kind: "PROMOVER",
    targetUsuarioId: null,
    targetNome: null,
    targetPapel: null,
  });

  const [removeConfirm, setRemoveConfirm] = useState<RemoveConfirmState>({
    open: false,
    usuarioId: null,
    nome: null,
  });

  async function load() {
    try {
      setErr(null);
      setOkMsg(null);
      setLoading(true);

      if (!equipeId) {
        setErr("ID de equipe ausente.");
        return;
      }

      const [eu, equipe] = await Promise.all([getEu(), getEquipe(equipeId)]);
      setEuId(eu.id);
      setData(equipe);

      const meu = (equipe.membros ?? []).find((m) => m.usuarioId === eu.id);
      setSouAdmin(isAdminRole(meu?.papel));
    } catch (e: any) {
      const status = e?.response?.status;
      const resData = e?.response?.data;
      setErr(
        status
          ? `Erro (HTTP ${status}): ${JSON.stringify(resData)}`
          : "Falha de rede / CORS / backend fora."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipeId]);

  const membros = useMemo(() => data?.membros ?? [], [data]);
  const membrosAtivos = useMemo(() => membros.filter((m) => m.ativo).length, [membros]);

  const adminsAtivos = useMemo(() => {
    return membros.filter((m) => m.ativo && isAdminRole(m.papel)).length;
  }, [membros]);

  const criadoEm = fmtISOToBR((data as any)?.criadoEm);
  const criadoPor = (data as any)?.criadoPorUsuarioId ?? null;

  function openConfirmFor(m: (typeof membros)[number]) {
    if (!data) return;
    if (!souAdmin) return;
    if (euId != null && m.usuarioId === euId) return;

    const kind: ConfirmKind = isAdminRole(m.papel) ? "REBAIXAR" : "PROMOVER";

    if (kind === "REBAIXAR" && adminsAtivos <= 1) {
      setErr("Não é possível rebaixar o último administrador.");
      return;
    }

    setErr(null);
    setOkMsg(null);
    setConfirm({
      open: true,
      kind,
      targetUsuarioId: m.usuarioId,
      targetNome: m.nome,
      targetPapel: m.papel,
    });
  }

  function closeConfirm() {
    setConfirm({
      open: false,
      kind: "PROMOVER",
      targetUsuarioId: null,
      targetNome: null,
      targetPapel: null,
    });
  }

  async function applyConfirm() {
    if (!data) return;
    if (!confirm.targetUsuarioId) return;

    setBusyUserId(confirm.targetUsuarioId);

    try {
      if (confirm.kind === "PROMOVER") {
        await promoverAdmin(data.id, confirm.targetUsuarioId);
        setOkMsg(`Promovido a admin: ${confirm.targetNome ?? confirm.targetUsuarioId}`);
      } else {
        if (adminsAtivos <= 1) {
          setErr("Não é possível rebaixar o último administrador.");
          return;
        }
        await rebaixarMembro(data.id, confirm.targetUsuarioId);
        setOkMsg(`Rebaixado para membro: ${confirm.targetNome ?? confirm.targetUsuarioId}`);
      }

      closeConfirm();
      await load();
    } catch (e: any) {
      const status = e?.response?.status;
      const resData = e?.response?.data;
      setErr(
        status
          ? `Erro (HTTP ${status}): ${JSON.stringify(resData)}`
          : "Falha ao aplicar alteração."
      );
    } finally {
      setBusyUserId(null);
    }
  }

  function openRemoveConfirmFor(m: (typeof membros)[number]) {
    if (!data) return;
    if (!souAdmin) return;
    if (euId != null && m.usuarioId === euId) return;

    setErr(null);
    setOkMsg(null);
    setRemoveConfirm({ open: true, usuarioId: m.usuarioId, nome: m.nome });
  }

  function closeRemoveConfirm() {
    setRemoveConfirm({ open: false, usuarioId: null, nome: null });
  }

  async function applyRemove() {
    if (!data) return;
    if (!removeConfirm.usuarioId) return;

    setBusyUserId(removeConfirm.usuarioId);

    try {
      await removerMembro(data.id, removeConfirm.usuarioId);
      setOkMsg(`Membro removido: ${removeConfirm.nome ?? removeConfirm.usuarioId}`);

      closeRemoveConfirm();
      await load();
    } catch (e: any) {
      const status = e?.response?.status;
      const resData = e?.response?.data;
      setErr(
        status
          ? `Erro (HTTP ${status}): ${JSON.stringify(resData)}`
          : "Falha ao remover membro."
      );
    } finally {
      setBusyUserId(null);
    }
  }

  if (loading) {
    return <div className="edLoading">Carregando detalhes...</div>;
  }

  if (err) {
    return (
      <div className="edShell">
        <div className="edPanel">
          <div className="edErrorTitle">Erro</div>
          <div className="edErrorText">{err}</div>
          <button className="edBtn" type="button" onClick={() => nav(-1)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="edShell">
        <div className="edPanel">
          <div className="edErrorTitle">Equipe não encontrada</div>
          <button className="edBtn" type="button" onClick={() => nav(-1)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="edShell">
      <div className="edPanel">
        {/* TOP BAR */}
        <div className="edTopBar">
          <button className="edIconBtn" type="button" onClick={() => nav(-1)}>
            ←
          </button>
          <div className="edTopTitle">Detalhes da equipe</div>
          <div className="edTopRight" />
        </div>

        {/* COVER */}
        <div className="edCover">
          <img src="/quadra.png" alt="Quadra" />
        </div>

        {/* HEADER */}
        <div className="edHeader">
          <div className="edHeaderLeft">
            <div className="edName">{data.nome}</div>
            <div className="edMetaLine">
              <span className="edDot">●</span>
              <span>{data.cepOuLocal}</span>
            </div>

            {okMsg && <div className="edOkMsg">{okMsg}</div>}
          </div>

          <div className="edHeaderRight">
            <div className="edBadgeStatus">{data.statusEquipe}</div>
            <div className="edBadgeSmall">
              {membrosAtivos}/{membros.length} ativos
            </div>
          </div>
        </div>

        {/* chips */}
        <div className="edChips">
          <div className="edChip">
            <div className="edChipLabel">Esporte</div>
            <div className="edChipValue">{data.esporte}</div>
          </div>

          <div className="edChip">
            <div className="edChipLabel">Dias/Horários</div>
            <div className="edChipValue">{data.diasHorariosPadrao ? data.diasHorariosPadrao : "—"}</div>
          </div>

          {criadoEm && (
            <div className="edChip">
              <div className="edChipLabel">Criado em</div>
              <div className="edChipValue">{criadoEm}</div>
            </div>
          )}

          {criadoPor !== null && criadoPor !== undefined && (
            <div className="edChip">
              <div className="edChipLabel">Criado por</div>
              <div className="edChipValue">{String(criadoPor)}</div>
            </div>
          )}
        </div>

        {/* LISTA */}
        <div className="edSectionTitle">Lista</div>

        <div className="edTable">
          <div className="edTr edTh">
            <div>POS</div>
            <div>NOME</div>
            <div>ATIVO</div>
            <div>AÇÕES</div>
          </div>

          {membros.length === 0 ? (
            <div className="edEmpty">Sem membros.</div>
          ) : (
            membros.map((m) => {
              const isMe = euId != null && m.usuarioId === euId;
              const canManage = souAdmin && !isMe;

              return (
                <div className={`edTr ${m.ativo ? "isActive" : ""}`} key={m.usuarioId}>
                  <div className="edTd edPos">{m.papel}</div>

                  <div className="edTd edNameCell">
                    <span className="edNameText">{m.nome}</span>

                    {canManage && (
                      <button
                        type="button"
                        className="edCrownBtn"
                        onClick={() => openConfirmFor(m)}
                        disabled={busyUserId === m.usuarioId}
                        title={isAdminRole(m.papel) ? "Rebaixar para membro" : "Promover para administrador"}
                      >
                        👑
                      </button>
                    )}
                  </div>

                  <div className={`edTd pill ${m.ativo ? "ok" : ""}`}>
                    {m.ativo ? "Sim" : "Não"}
                  </div>

                  <div className="edTd">
                    {canManage ? (
                      <button
                        type="button"
                        className="edRemoveBtn"
                        onClick={() => openRemoveConfirmFor(m)}
                        disabled={busyUserId === m.usuarioId}
                        title="Remover membro"
                      >
                        Remover
                      </button>
                    ) : (
                      <span className="edDash">—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CTA */}
        <button className="edCta" type="button" onClick={() => nav(`/equipes/${data.id}/partidas`)}>
          Ver partidas
          <span className="edArrow">→</span>
        </button>
      </div>

      {/* Modal Promover/Rebaixar */}
      {confirm.open && (
        <div className="edConfirmOverlay" onClick={closeConfirm} role="dialog" aria-modal="true">
          <div className="edConfirmCard" onClick={(e) => e.stopPropagation()}>
            <div className="edConfirmTitle">
              {confirm.kind === "PROMOVER" ? "Promover a administrador?" : "Rebaixar para membro?"}
            </div>

            <div className="edConfirmText">
              Alvo: <b>{confirm.targetNome}</b> (ID {confirm.targetUsuarioId})
            </div>

            {confirm.kind === "REBAIXAR" && adminsAtivos <= 1 && (
              <div className="edConfirmWarn">
                A equipe tem apenas 1 admin ativo. Não é permitido rebaixar o último administrador.
              </div>
            )}

            <div className="edConfirmActions">
              <button className="edBtn" type="button" onClick={closeConfirm}>
                Cancelar
              </button>

              <button
                className="edBtnPrimary"
                type="button"
                onClick={applyConfirm}
                disabled={
                  confirm.targetUsuarioId == null ||
                  busyUserId === confirm.targetUsuarioId ||
                  (confirm.kind === "REBAIXAR" && adminsAtivos <= 1)
                }
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Remover */}
      {removeConfirm.open && (
        <div className="edConfirmOverlay" onClick={closeRemoveConfirm} role="dialog" aria-modal="true">
          <div className="edConfirmCard" onClick={(e) => e.stopPropagation()}>
            <div className="edConfirmTitle">Remover membro?</div>

            <div className="edConfirmText">
              Você vai remover <b>{removeConfirm.nome}</b>. (ID {removeConfirm.usuarioId})
            </div>

            <div className="edConfirmActions">
              <button className="edBtn" type="button" onClick={closeRemoveConfirm}>
                Cancelar
              </button>

              <button
                className="edBtnPrimary"
                type="button"
                onClick={applyRemove}
                disabled={removeConfirm.usuarioId == null || busyUserId === removeConfirm.usuarioId}
              >
                Confirmar remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}