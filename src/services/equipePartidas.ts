import { api } from "./api";

export type PoliticaInscricao = "SOMENTE_MEMBROS" | "AVULSOS_ABERTOS";

export type PartidaResumo = {
  id: number;
  dataHora: string;
  statusPartida: string;
  totalConfirmados: number;
  limiteParticipantes?: number | null;
  jogadoresPorTime?: number | null;
};

export type CriarPartidaBody = {
  dataHora: string; // ISO
  politicaInscricao: PoliticaInscricao;
  jogadoresPorTime: number;
  limiteParticipantes?: number; // opcional
};

export async function listarPartidasEquipe(equipeId: string | number) {
  const { data } = await api.get(`/equipes/${equipeId}/partidas`);
  return (data ?? []) as PartidaResumo[];
}

export async function criarPartidaEquipe(
  equipeId: string | number,
  body: CriarPartidaBody
) {
  const { data } = await api.post(`/equipes/${equipeId}/partidas`, body);
  return data;
}

/* ── Busca global de partidas (descobrir partidas abertas/futuras) ───────── */

export type PartidaBuscaResumo = {
  id: number;
  equipeId: number;
  equipeNome?: string | null;
  dataHora: string;
  esporte?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  statusPartida?: string | null;
  politicaInscricao?: string | null;
  totalConfirmados?: number | null;
  limiteParticipantes?: number | null;
};

export type BuscarPartidasPage = {
  items: PartidaBuscaResumo[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// O backend devolve o id da partida como "partidaId" — normaliza pra "id".
function normalizarPartida(it: any): PartidaBuscaResumo {
  return { ...it, id: Number(it?.id ?? it?.partidaId) };
}

/**
 * Busca partidas abertas/futuras. Espera GET /partidas/buscar (Spring Pageable:
 * page 0-based, parametro "size"). Se o endpoint ainda nao existir, o caller
 * trata via isNotImplemented().
 */
export async function buscarPartidas(
  q: string,
  opts?: { page?: number; pageSize?: number }
): Promise<BuscarPartidasPage> {
  const page = opts?.page ?? 1;        // 1-based (vem da UI)
  const pageSize = opts?.pageSize ?? 10;
  const params: Record<string, string | number> = {
    q,
    page: Math.max(0, page - 1),       // backend Spring é 0-based
    size: pageSize,
  };
  const res = await api.get("/partidas/buscar", { params });
  const raw = res.data;

  if (Array.isArray(raw)) {
    const items = raw.map(normalizarPartida);
    return {
      items,
      page,
      pageSize,
      total: items.length,
      totalPages: items.length < pageSize ? page : page + 1,
    };
  }

  const items = ((raw?.content ?? raw?.items ?? raw?.data ?? []) as any[]).map(normalizarPartida);
  const total = Number(raw?.totalElements ?? raw?.total ?? items.length) || 0;
  const ps = Number(raw?.size ?? raw?.pageSize ?? pageSize) || pageSize;
  const pg =
    raw?.number != null ? Number(raw.number) + 1
    : raw?.page != null ? Number(raw.page)
    : page;
  const totalPages = Number(raw?.totalPages ?? Math.max(1, Math.ceil(total / ps))) || 1;
  return { items, page: pg, pageSize: ps, total, totalPages };
}