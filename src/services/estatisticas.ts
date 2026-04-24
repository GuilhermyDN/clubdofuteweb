import { api } from "./api";

export type Estatisticas = {
    totalPartidasJogadas?: number;
    totalPartidasConfirmadas?: number;
    totalEquipes?: number;
    notaMediaVolei?: number | null;
    notaMediaFutevolei?: number | null;
    rankingPosicao?: number | null;
    // fallback pra qualquer shape que o backend devolva
    [k: string]: any;
};

export async function getEstatisticas(): Promise<Estatisticas> {
    const res = await api.get("/estatisticas");
    return res.data as Estatisticas;
}
