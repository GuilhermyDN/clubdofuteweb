/**
 * DEMO-ONLY: enriquece respostas do backend com fotoPerfil dos usuários.
 * O backend ainda não retorna fotoPerfil nos DTOs de membro/presenca/jogador.
 * Este arquivo serve só para o demo local em /equipes/:id e /partidas/:id.
 * REMOVER assim que o backend Java incluir fotoPerfil nesses DTOs.
 */
import type { AxiosResponse } from "axios";

const PHOTO_BY_USER_ID: Record<number, string> = {};

export function registerPhoto(usuarioId: number, url: string | null | undefined) {
    if (!usuarioId || !url) return;
    PHOTO_BY_USER_ID[usuarioId] = url;
}

function enrichItem<T extends { usuarioId?: number; fotoPerfil?: string | null }>(item: T): T {
    if (!item || item.fotoPerfil || !item.usuarioId) return item;
    const url = PHOTO_BY_USER_ID[item.usuarioId];
    if (url) (item as any).fotoPerfil = url;
    return item;
}

function enrichArray(arr: any): void {
    if (!Array.isArray(arr)) return;
    for (const it of arr) enrichItem(it);
}

export function enrichResponse(res: AxiosResponse): AxiosResponse {
    const d = res.data;
    if (!d || typeof d !== "object") return res;

    // /eu — cacheia minha própria foto
    if (typeof d.id === "number" && d.fotoPerfil) {
        registerPhoto(d.id, d.fotoPerfil);
    }

    // /equipes/:id  → membros[]
    enrichArray(d.membros);

    // /partidas/:id → presencas[] + timesGerados.times[].jogadores[] + timesGerados.reservas[]
    enrichArray(d.presencas);
    if (d.timesGerados) {
        if (Array.isArray(d.timesGerados.times)) {
            for (const t of d.timesGerados.times) enrichArray(t.jogadores);
        }
        enrichArray(d.timesGerados.reservas);
    }

    // /eu/estatisticas → parceirosFrequentes[]
    enrichArray(d.parceirosFrequentes);

    return res;
}
