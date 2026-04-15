import { useEffect } from "react";

/**
 * Mount once at the root. Two jobs:
 *  1) Reveal-on-scroll: elements with `.x-reveal` gain `.x-in` once (then unobserved).
 *  2) Animation gating: elements with `.x-vis-toggle` (ball3d, marquee) toggle `.is-vis`
 *     so CSS can pause expensive infinite animations when off-screen.
 */
export default function RevealObserver() {
    useEffect(() => {
        // one-shot reveals
        const revealIO = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("x-in");
                        revealIO.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
        );

        // persistent visibility toggling (for pauseable animations)
        const visIO = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    entry.target.classList.toggle("is-vis", entry.isIntersecting);
                });
            },
            { threshold: 0.01 }
        );

        const observeAll = () => {
            document.querySelectorAll(".x-reveal:not(.x-in)").forEach((el) => revealIO.observe(el));
            document.querySelectorAll(".x-vis-toggle").forEach((el) => {
                if (!(el as any)._xVisObs) {
                    (el as any)._xVisObs = true;
                    visIO.observe(el);
                }
            });
        };

        observeAll();

        const mo = new MutationObserver(() => observeAll());
        mo.observe(document.body, { childList: true, subtree: true });

        return () => {
            revealIO.disconnect();
            visIO.disconnect();
            mo.disconnect();
        };
    }, []);

    return null;
}
