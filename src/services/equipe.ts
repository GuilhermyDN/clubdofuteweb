import { api } from "./api";

export type Esporte = "FUTEBOL" | "VOLEI" | "FUTEVOLEI";
export type StatusEquipe = "ABERTA" | "FECHADA";

export type EquipeResumo = {
  id: string;
  nome: string;
  cepOuLocal: string;
  esporte: Esporte;
  statusEquipe: StatusEquipe;
  diasHorariosPadrao?: string | null;
};

export type MembroEquipe = {
  usuarioId: number;
  nome: string;
  papel: "ADMIN" | "ADMINISTRADOR" | "MEMBRO" | string;
  ativo: boolean;
  nota?: number | null;
};

export type EquipeDetalhe = EquipeResumo & {
  membros?: MembroEquipe[];
  totalMembros?: number;
  criadoEm?: string;
  criadoPorUsuarioId?: number;
  notaEquipe?: number | null;
  // se o backend devolver, ótimo. se não devolver, fica undefined por enquanto
  meuPapel?: "ADMIN" | "MEMBRO";
  souMembro?: boolean;
};

export type CriarEquipeBody = {
  nome: string;
  cepOuLocal: string;
  esporte: Esporte;
  statusEquipe: StatusEquipe;
  senhaEquipe?: string; // obrigatório se FECHADA
  diasHorariosPadrao: string;
};

export async function criarEquipe(body: CriarEquipeBody): Promise<EquipeDetalhe> {
  const res = await api.post("/equipes", body);
  return res.data as EquipeDetalhe;
}

export type BuscarEquipesPage = {
  items: EquipeResumo[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function buscarEquipes(
  q: string,
  opts?: { lat?: number; lng?: number; raioKm?: number; page?: number; pageSize?: number }
): Promise<BuscarEquipesPage> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const params: Record<string, string | number> = { q, page, pageSize };
  if (opts?.lat != null && opts?.lng != null) {
    params.lat = opts.lat;
    params.lng = opts.lng;
    if (opts.raioKm != null) params.raioKm = opts.raioKm;
  }
  const res = await api.get("/equipes/buscar", { params });
  const raw = res.data;

  // backend ainda pode devolver array puro: encaixa em paginacao "fake"
  if (Array.isArray(raw)) {
    return {
      items: raw as EquipeResumo[],
      page,
      pageSize,
      total: raw.length,
      totalPages: raw.length < pageSize ? page : page + 1,
    };
  }

  const items = (raw?.items ?? raw?.content ?? raw?.data ?? []) as EquipeResumo[];
  const total = Number(raw?.total ?? raw?.totalElements ?? items.length) || 0;
  const ps = Number(raw?.pageSize ?? raw?.size ?? pageSize) || pageSize;
  const pg = Number(raw?.page ?? raw?.number ?? page) || page;
  const totalPages = Number(raw?.totalPages ?? Math.max(1, Math.ceil(total / ps))) || 1;
  return { items, page: pg, pageSize: ps, total, totalPages };
}

export async function getEquipe(equipeId: string): Promise<EquipeDetalhe> {
  const res = await api.get(`/equipes/${equipeId}`);
  return res.data as EquipeDetalhe;
}

export async function entrarEquipeAberta(equipeId: string): Promise<any> {
  const res = await api.post(`/equipes/${equipeId}/entrar`);
  return res.data;
}

export async function entrarEquipeFechada(equipeId: string, senhaEquipe: string): Promise<any> {
  const res = await api.post(`/equipes/${equipeId}/entrar-com-senha`, { senhaEquipe });
  return res.data;
}

export async function trocarSenhaEquipe(equipeId: string, novaSenhaEquipe: string): Promise<any> {
  const res = await api.patch(`/equipes/${equipeId}/senha`, { novaSenhaEquipe });
  return res.data;
}

export async function listarMinhasEquipes(): Promise<EquipeResumo[]> {
  const res = await api.get("/eu/equipes");
  return res.data as EquipeResumo[];
}

export type AtualizarEquipeBody = Partial<{
  nome: string;
  cepOuLocal: string;
  esporte: Esporte;
  statusEquipe: StatusEquipe;
  diasHorariosPadrao: string;
}>;

export async function atualizarEquipe(equipeId: string | number, body: AtualizarEquipeBody): Promise<EquipeDetalhe> {
  const res = await api.put(`/equipes/${equipeId}`, body);
  return res.data as EquipeDetalhe;
}

export async function deletarEquipe(equipeId: string | number): Promise<void> {
  await api.delete(`/equipes/${equipeId}`);
}