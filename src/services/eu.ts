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
  criadoEm?: string;
};

export async function getEu(): Promise<EuDTO> {
  const res = await api.get("/eu");
  return res.data as EuDTO;
}

export async function patchEu(payload: EuDTO): Promise<EuDTO> {
  const res = await api.patch("/eu", payload);
  return res.data as EuDTO;
}