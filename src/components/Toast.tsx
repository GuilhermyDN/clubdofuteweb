import { useEffect, useState } from "react";

/* ── Types ───────────────────────────────────────────────────── */
export type ToastKind = "success" | "error" | "info" | "warning";

export type ToastItem = {
    id: number;
    kind: ToastKind;
    title?: string;
    text: string;
    duration: number;
};

type ToastListener = (list: ToastItem[]) => void;

/* ── Store (pub/sub — no context needed) ─────────────────────── */
let _items: ToastItem[] = [];
let _id = 1;
const _listeners = new Set<ToastListener>();

function emit() {
    _listeners.forEach((l) => l([..._items]));
}

function push(kind: ToastKind, text: string, title?: string, duration = 4200) {
    const id = _id++;
    _items = [..._items, { id, kind, text, title, duration }];
    emit();
    if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
    }
    return id;
}

function dismiss(id: number) {
    _items = _items.filter((t) => t.id !== id);
    emit();
}

/* ── Public API ──────────────────────────────────────────────── */
export const toast = {
    success: (text: string, title?: string, duration?: number) => push("success", text, title, duration),
    error: (text: string, title?: string, duration?: number) => push("error", text, title, duration ?? 5200),
    info: (text: string, title?: string, duration?: number) => push("info", text, title, duration),
    warn: (text: string, title?: string, duration?: number) => push("warning", text, title, duration),
    dismiss,
};

/* ── Viewport component (mount once at root) ─────────────────── */
export default function ToastViewport() {
    const [items, setItems] = useState<ToastItem[]>(_items);

    useEffect(() => {
        _listeners.add(setItems);
        return () => {
            _listeners.delete(setItems);
        };
    }, []);

    if (items.length === 0) return null;

    return (
        <div className="x-toast-viewport" aria-live="polite" aria-atomic="true">
            {items.map((t) => (
                <div
                    key={t.id}
                    className={`x-toast x-toast-${t.kind}`}
                    role={t.kind === "error" ? "alert" : "status"}
                >
                    <div className="x-toast-icon">{iconFor(t.kind)}</div>
                    <div className="x-toast-body">
                        {t.title && <div className="x-toast-title">{t.title}</div>}
                        <div className="x-toast-text">{t.text}</div>
                    </div>
                    <button
                        className="x-toast-close"
                        onClick={() => dismiss(t.id)}
                        aria-label="Fechar"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}

function iconFor(k: ToastKind) {
    if (k === "success") {
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        );
    }
    if (k === "error") {
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12" y2="16.1" />
            </svg>
        );
    }
    if (k === "warning") {
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12" y2="17.1" />
            </svg>
        );
    }
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="8.1" />
        </svg>
    );
}
