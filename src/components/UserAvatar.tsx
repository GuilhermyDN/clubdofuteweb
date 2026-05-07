import { useState } from "react";

type Size = "sm" | "md" | "lg" | "xl";

type Props = {
    nome?: string | null;
    fotoPerfil?: string | null;
    size?: Size;
    className?: string;
    style?: React.CSSProperties;
    title?: string;
};

function initialsOf(nome?: string | null) {
    const n = (nome ?? "").trim();
    if (!n) return "?";
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "?";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? "");
    return (a + b).toUpperCase();
}

export default function UserAvatar({ nome, fotoPerfil, size = "sm", className = "", style, title }: Props) {
    const [broken, setBroken] = useState(false);
    const cls = `x-avatar ${size} ${className}`.trim();
    if (fotoPerfil && !broken) {
        return (
            <img
                src={fotoPerfil}
                alt={nome ?? ""}
                className={cls}
                style={{ objectFit: "cover", padding: 0, ...style }}
                title={title ?? nome ?? undefined}
                onError={() => setBroken(true)}
            />
        );
    }
    return (
        <div className={cls} style={style} title={title ?? nome ?? undefined}>
            {initialsOf(nome)}
        </div>
    );
}
