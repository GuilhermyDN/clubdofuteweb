import { api } from "./api";
// usa o mesmo axios instance que você já usa nos outros services

export async function getPartida(partidaId: string | number) {
  const { data } = await api.get(`/partidas/${partidaId}`);
  return data;
}

export async function confirmarPresenca(partidaId: string | number) {
  const { data } = await api.post(`/partidas/${partidaId}/confirmar-presenca`);
  return data;
}

export async function cancelarPresenca(partidaId: string | number) {
  const { data } = await api.post(`/partidas/${partidaId}/cancelar-presenca`);
  return data;
}

export async function fecharListaEGerarTimes(partidaId: string | number) {
  const { data } = await api.post(`/partidas/${partidaId}/fechar-lista-e-gerar-times`);
  return data;
}

export async function liberarAvaliacao(partidaId: string | number) {
  const { data } = await api.post(`/partidas/${partidaId}/liberar-avaliacao`);
  return data;
}

export async function enviarAvaliacoes(partidaId: string | number, avaliacoes: any[]) {
  const { data } = await api.post(`/partidas/${partidaId}/avaliacoes`, avaliacoes);
  return data;
}

export async function encerrarAvaliacao(partidaId: string | number) {
  const { data } = await api.post(`/partidas/${partidaId}/encerrar-avaliacao`);
  return data;
}

export async function enviarAvaliacoesTimes(
  partidaId: string | number,
  avaliacoes: Array<{ tipoAlvo: "TIME"; alvoId: string; nota: number }>
) {
  const { data } = await api.post(`/partidas/${partidaId}/avaliacoes`, {
    avaliacoes,
  });
  return data;
}

export async function getAvaliacoesPartida(partidaId: string | number) {
  const { data } = await api.get(`/partidas/${partidaId}/avaliacoes`);

  // backend retorna array direto
  if (Array.isArray(data)) {
    return { avaliacoes: data };
  }

  // fallback se um dia vier no formato objeto
  if (Array.isArray(data?.avaliacoes)) {
    return data;
  }

  return { avaliacoes: [] };
}