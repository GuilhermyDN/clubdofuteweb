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