import axios from "axios";
import { clearToken, getToken } from "../utils/auth";
import { enrichResponse, registerPhoto } from "../utils/devPhotoEnricher";

export const api = axios.create({
  baseURL: "http://72.60.54.232:8579",
  timeout: 20000,
});

// DEMO-ONLY: cache de fotos por usuarioId (remover quando o backend retornar fotoPerfil)
const DEMO_PHOTOS: Record<number, string> = {
  3: "https://pub-a40bfb8bb6d84346a53f079b2806026b.r2.dev/fotos/3_1778619305355.jpg",
  4: "https://pub-a40bfb8bb6d84346a53f079b2806026b.r2.dev/fotos/4_1778619531113.jpg",
  5: "https://pub-a40bfb8bb6d84346a53f079b2806026b.r2.dev/fotos/5_1778619532414.jpg",
  6: "https://pub-a40bfb8bb6d84346a53f079b2806026b.r2.dev/fotos/6_1778619533524.jpg",
  7: "https://pub-a40bfb8bb6d84346a53f079b2806026b.r2.dev/fotos/7_1778619534605.jpg",
  8: "https://pub-a40bfb8bb6d84346a53f079b2806026b.r2.dev/fotos/8_1778619535713.jpg",
  9: "https://pub-a40bfb8bb6d84346a53f079b2806026b.r2.dev/fotos/9_1778619536749.jpg",
};
Object.entries(DEMO_PHOTOS).forEach(([id, url]) => registerPhoto(Number(id), url));

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
  (res) => enrichResponse(res),
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
