import { api } from "./api";

export type EuDTO = {
  id: number;
  nome: string;
  telefone?: string;
  cep: string;
  peso: number;
  altura: number;
  notaVolei: number;
  notaFutevolei: number;
  fotoPerfil?: string | null;
  criadoEm?: string;
};

export async function uploadFotoPerfil(arquivo: File): Promise<EuDTO> {
  const form = new FormData();
  form.append("arquivo", arquivo);
  const res = await api.post("/eu/foto", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as EuDTO;
}

export async function getEu(): Promise<EuDTO> {
  const res = await api.get("/eu");
  return res.data as EuDTO;
}

export async function patchEu(payload: EuDTO): Promise<EuDTO> {
  const res = await api.patch("/eu", payload);
  return res.data as EuDTO;
}