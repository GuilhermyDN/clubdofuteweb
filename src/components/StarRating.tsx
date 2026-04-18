import { useState } from "react";

type Props = {
    value: number; // 0 a 10
    onChange: (v: number) => void;
    disabled?: boolean;
    size?: number;
    showNumber?: boolean;
};

const STAR_PATH =
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

/**
 * Rating 0-10 em 5 estrelas. Clique na metade esquerda = valor ímpar,
 * na metade direita = valor par. Ex.: metade esquerda da estrela 3 → 5.
 */
export default function StarRating({ value, onChange, disabled, size = 48, showNumber = true }: Props) {
    const [hover, setHover] = useState<number | null>(null);
    const display = hover ?? value;

    function calcValueAt(e: React.PointerEvent<HTMLButtonElement>, idx: number): number {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isLeft = x < rect.width / 2;
        const v = idx * 2 + (isLeft ? 1 : 2);
        return Math.max(0, Math.min(10, v));
    }

    function handleClick(e: React.PointerEvent<HTMLButtonElement>, idx: number) {
        if (disabled) return;
        onChange(calcValueAt(e, idx));
    }

    function handleMove(e: React.PointerEvent<HTMLButtonElement>, idx: number) {
        if (disabled) return;
        setHover(calcValueAt(e, idx));
    }

    return (
        <div
            className={`x-stars ${disabled ? "is-disabled" : ""}`}
            onMouseLeave={() => setHover(null)}
            role="radiogroup"
            aria-label="Nota do time"
        >
            <div className="x-stars-row">
                {[0, 1, 2, 3, 4].map((i) => {
                    const fill = Math.max(0, Math.min(1, (display - i * 2) / 2));
                    return (
                        <button
                            key={i}
                            type="button"
                            className="x-star"
                            disabled={disabled}
                            onPointerMove={(e) => handleMove(e, i)}
                            onPointerDown={(e) => handleClick(e, i)}
                            style={{ width: size, height: size }}
                            aria-label={`Estrelas ${i + 1}`}
                        >
                            <svg viewBox="0 0 24 24" className="x-star-bg">
                                <path d={STAR_PATH} />
                            </svg>
                            <svg
                                viewBox="0 0 24 24"
                                className="x-star-fg"
                                style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}
                            >
                                <path d={STAR_PATH} />
                            </svg>
                        </button>
                    );
                })}
            </div>
            {showNumber && (
                <div className="x-stars-ticker">
                    <span className="x-stars-current">{display}</span>
                    <span className="x-stars-max">/10</span>
                </div>
            )}
        </div>
    );
}
