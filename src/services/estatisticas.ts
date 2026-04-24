import { api } from "./api";

export type UltimaPartida = {
    partidaId: number;
    dataHora: string; // ISO
    notaRecebida: number | null;
    foiMvp: boolean;
};

export type ParceiroFrequente = {
    usuarioId: number;
    nome: string;
    totalPartidasJuntos: number;
};

export type Estatisticas = {
    usuarioId: number;
    nome: string;
    notaAtual: number | null;
    totalPartidas: number;
    mediaNotasRecebidas: number | null;
    ultimasPartidas: UltimaPartida[];
    parceirosFrequentes: ParceiroFrequente[];
};

export async function getEstatisticas(): Promise<Estatisticas> {
    const res = await api.get("/eu/estatisticas");
    return res.data as Estatisticas;
}

export async function getEstatisticasUsuario(usuarioId: number | string): Promise<Estatisticas> {
    const res = await api.get(`/usuarios/${usuarioId}/estatisticas`);
    return res.data as Estatisticas;
}
