import { api } from "./api";

export type MensagemResponse = { mensagem: string };

export async function removerMembro(equipeId: number, usuarioId: number) {
  const { data } = await api.delete<MensagemResponse>(
    `/equipes/${equipeId}/membros/${usuarioId}`
  );
  return data;
}

export async function promoverAdmin(equipeId: number, usuarioId: number) {
  const { data } = await api.post<MensagemResponse>(
    `/equipes/${equipeId}/membros/${usuarioId}/promover-admin`
  );
  return data;
}

export async function rebaixarMembro(equipeId: number, usuarioId: number) {
  const { data } = await api.post<MensagemResponse>(
    `/equipes/${equipeId}/membros/${usuarioId}/rebaixar-membro`
  );
  return data;
}