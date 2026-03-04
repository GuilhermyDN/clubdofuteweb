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

export type EquipeDetalhe = EquipeResumo & {
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

export async function buscarEquipes(q: string): Promise<EquipeResumo[]> {
  const res = await api.get("/equipes/buscar", { params: { q } });
  return res.data as EquipeResumo[];
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