/**
 * Converte qualquer erro (axios, fetch, js) em uma mensagem curta e amigável.
 */
export function explainError(e: any): string {
    if (!e) return "Erro desconhecido.";

    // string direto
    if (typeof e === "string") return e;

    // axios / fetch-like
    const status: number | undefined = e?.response?.status;
    const data = e?.response?.data;

    // sem status = problema de rede / CORS / backend offline
    if (!status) {
        if (e?.code === "ECONNABORTED") return "Tempo esgotado. Tente novamente.";
        if (e?.message === "Network Error") return "Falha de conexão. Verifique sua internet.";
        return e?.message || "Falha de rede. Tente novamente em instantes.";
    }

    // extrai mensagem do backend
    const backendMsg =
        (typeof data?.mensagem === "string" && data.mensagem) ||
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        (Array.isArray(data?.errors) && data.errors.map((x: any) => x?.message || x).join(", ")) ||
        null;

    // mapa amigável por status
    const byStatus: Record<number, string> = {
        400: backendMsg || "Dados inválidos.",
        401: "Sessão expirada. Faça login novamente.",
        403: backendMsg || "Você não tem permissão para isso.",
        404: backendMsg || "Não encontrado.",
        409: backendMsg || "Conflito — já existe um registro parecido.",
        422: backendMsg || "Dados inválidos.",
        429: "Muitas tentativas. Aguarde um instante.",
        500: "Erro no servidor. Tente novamente em instantes.",
        502: "Servidor indisponível. Tente novamente.",
        503: "Serviço em manutenção. Tente mais tarde.",
        504: "Tempo esgotado no servidor.",
    };

    return byStatus[status] || backendMsg || `Erro (HTTP ${status}).`;
}

/** Retorna true se o erro é 401 ou 403 (não autorizado). */
export function isAuthError(e: any): boolean {
    const s = e?.response?.status;
    return s === 401 || s === 403;
}
