import { useEffect, useRef, useState } from "react";

type Props = {
    to: number;
    from?: number;
    duration?: number;
    suffix?: string;
    prefix?: string;
    decimals?: number;
    className?: string;
};

export default function CountUp({
    to,
    from = 0,
    duration = 1600,
    suffix = "",
    prefix = "",
    decimals = 0,
    className = "",
}: Props) {
    const [value, setValue] = useState(from);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const startTime = performance.now();
                    const range = to - from;

                    const step = (now: number) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(1, elapsed / duration);
                        // easeOutQuart
                        const eased = 1 - Math.pow(1 - progress, 4);
                        setValue(from + range * eased);
                        if (progress < 1) requestAnimationFrame(step);
                        else setValue(to);
                    };

                    requestAnimationFrame(step);
                    io.disconnect();
                }
            },
            { threshold: 0.4 }
        );

        io.observe(el);
        return () => io.disconnect();
    }, [to, from, duration]);

    return (
        <span ref={ref} className={`x-count ${className}`}>
            {prefix}
            {value.toFixed(decimals)}
            {suffix}
        </span>
    );
}
