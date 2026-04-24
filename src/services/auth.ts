import { api } from "./api";


export async function cadastrar(data: {
    nome: string;
    telefone: string;
    cep: string;
    senha: string;
}) {
    const res = await api.post("/autenticacao/cadastrar", data);
    return res.data;
}

export async function login(body: { telefone: string; senha: string }) {
    const res = await api.post("/autenticacao/entrar", body);
    return res.data;
}

export async function recuperarSenha(telefone: string) {
    const res = await api.post("/autenticacao/recuperar-senha", { telefone });
    return res.data;
}