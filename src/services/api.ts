import axios from "axios";
import { clearToken, getToken } from "../utils/auth";

export const api = axios.create({
  baseURL: "http://72.60.54.232:8579",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// rotas que são públicas — não devem redirecionar em 401
const PUBLIC_PATHS = [
  "/autenticacao/entrar",
  "/autenticacao/cadastrar",
];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url: string = err?.config?.url || "";
    const isPublic = PUBLIC_PATHS.some((p) => url.includes(p));

    // Token inválido / expirado: limpa e manda pro login
    // (exceto em chamadas públicas de login/cadastro, que devem só devolver o erro)
    if ((status === 401 || status === 403) && !isPublic) {
      clearToken();
      // evita loop se já estamos no /login
      if (!window.location.pathname.startsWith("/login")) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/login?next=${redirect}`);
      }
    }

    return Promise.reject(err);
  }
);
