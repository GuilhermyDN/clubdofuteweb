import { useRef, type ReactNode, type CSSProperties } from "react";

type Props = {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    strength?: number;
    onClick?: () => void;
};

export default function TiltCard({
    children,
    className = "",
    style,
    strength = 12,
    onClick,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);

    function onMove(e: React.MouseEvent<HTMLDivElement>) {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rx = (y - 0.5) * -strength;
        const ry = (x - 0.5) * strength;
        el.style.setProperty("--tx", `${ry}deg`);
        el.style.setProperty("--ty", `${rx}deg`);
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
    }

    function onEnter() {
        ref.current?.classList.add("is-hover");
    }
    function onLeave() {
        const el = ref.current;
        if (!el) return;
        el.classList.remove("is-hover");
        el.style.setProperty("--tx", "0deg");
        el.style.setProperty("--ty", "0deg");
    }

    return (
        <div
            ref={ref}
            className={`x-tilt ${className}`}
            style={style}
            onMouseMove={onMove}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onClick={onClick}
        >
            {children}
            <div className="x-tilt-glow" />
        </div>
    );
}
