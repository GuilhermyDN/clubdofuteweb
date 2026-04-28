import { api } from "./api";

export type StatusConvite = "PENDENTE" | "ACEITO" | "RECUSADO" | string;

export type Convite = {
    id: number;
    equipeId: number;
    equipeNome?: string;
    telefoneDestino?: string;
    remetenteUsuarioId?: number;
    remetenteNome?: string;
    remetenteFotoPerfil?: string | null;
    destinatarioUsuarioId?: number;
    destinatarioNome?: string;
    destinatarioFotoPerfil?: string | null;
    status: StatusConvite;
    criadoEm?: string;
};

export type EnviarConviteBody = {
    equipeId: number;
    telefone: string;
};

export async function listarConvites(): Promise<Convite[]> {
    const res = await api.get("/convites");
    return (res.data ?? []) as Convite[];
}

export async function enviarConvite(body: EnviarConviteBody): Promise<Convite> {
    const res = await api.post("/convites", body);
    return res.data as Convite;
}

export async function aceitarConvite(id: number) {
    const res = await api.post(`/convites/${id}/aceitar`);
    return res.data;
}

export async function recusarConvite(id: number) {
    const res = await api.post(`/convites/${id}/recusar`);
    return res.data;
}
