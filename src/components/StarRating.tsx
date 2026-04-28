import { useEffect, useRef, useState } from "react";

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
 * Rating 0-10 em 5 estrelas (meia-estrela = 1 ponto).
 * - Clique/hover na metade esquerda da estrela N → 2N-1 (ex: esquerda da 3ª = 5).
 * - Clique/hover na metade direita da estrela N → 2N (ex: direita da 3ª = 6).
 * Animado: pulse no clique, pop nas estrelas novas acesas e ticker com bounce.
 */
export default function StarRating({ value, onChange, disabled, size = 48, showNumber = true }: Props) {
    const [hover, setHover] = useState<number | null>(null);
    const [pulseId, setPulseId] = useState(0);
    const prevValueRef = useRef(value);

    const display = hover ?? value;

    // Detecta qual estrela "acendeu" agora para dar pop (idx da estrela mais alta acesa)
    const highestLit = Math.ceil(display / 2); // 1..5

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
        setPulseId((p) => p + 1);
    }

    function handleMove(e: React.PointerEvent<HTMLButtonElement>, idx: number) {
        if (disabled) return;
        setHover(calcValueAt(e, idx));
    }

    // Ticker bounce quando value real muda
    const [tickerPulse, setTickerPulse] = useState(0);
    useEffect(() => {
        if (prevValueRef.current !== value) {
            prevValueRef.current = value;
            setTickerPulse((n) => n + 1);
        }
    }, [value]);

    return (
        <div
            className={`x-stars ${disabled ? "is-disabled" : ""}`}
            onMouseLeave={() => setHover(null)}
            role="radiogroup"
            aria-label="Nota"
        >
            <div className="x-stars-row">
                {[0, 1, 2, 3, 4].map((i) => {
                    const fill = Math.max(0, Math.min(1, (display - i * 2) / 2));
                    const isHighest = highestLit === i + 1 && fill > 0;
                    return (
                        <button
                            key={i}
                            type="button"
                            className={`x-star ${isHighest ? "is-tip" : ""}`}
                            disabled={disabled}
                            onPointerMove={(e) => handleMove(e, i)}
                            onPointerDown={(e) => handleClick(e, i)}
                            style={{ width: size, height: size }}
                            aria-label={`Estrelas ${i + 1}`}
                            data-pulse={pulseId}
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
                <div className="x-stars-ticker" key={tickerPulse}>
                    <span className="x-stars-current">{(display / 2).toFixed(display % 2 === 0 ? 0 : 1)}</span>
                    <span className="x-stars-max">/5</span>
                </div>
            )}
        </div>
    );
}
