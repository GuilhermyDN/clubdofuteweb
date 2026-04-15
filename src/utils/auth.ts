/**
 * Lightweight auth helpers — checks localStorage for the JWT token.
 */
const KEY = "cdf_token";

export function getToken(): string | null {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}

export function isLoggedIn(): boolean {
    return !!getToken();
}

export function setToken(token: string): void {
    try {
        localStorage.setItem(KEY, token);
        // notify same-tab listeners
        window.dispatchEvent(new Event("cdf:auth"));
    } catch { }
}

export function clearToken(): void {
    try {
        localStorage.removeItem(KEY);
        window.dispatchEvent(new Event("cdf:auth"));
    } catch { }
}

/**
 * React hook to subscribe to login/logout events across the app.
 */
import { useEffect, useState } from "react";

export function useAuth() {
    const [logged, setLogged] = useState(isLoggedIn());

    useEffect(() => {
        const sync = () => setLogged(isLoggedIn());
        window.addEventListener("storage", sync);
        window.addEventListener("cdf:auth", sync);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("cdf:auth", sync);
        };
    }, []);

    return { logged };
}
