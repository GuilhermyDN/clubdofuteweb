import { api } from "./api";

export type EuDTO = {
  nome: string;
  cep: string;
  peso: number;
  altura: number;
  notaVolei: number;
  notaFutevolei: number;
};

export async function getEu(): Promise<EuDTO> {
  const res = await api.get("/eu");
  return res.data as EuDTO;
}

export async function patchEu(payload: EuDTO): Promise<EuDTO> {
  const res = await api.patch("/eu", payload);
  return res.data as EuDTO;
}