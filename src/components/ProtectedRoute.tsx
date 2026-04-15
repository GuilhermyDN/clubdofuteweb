import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { isLoggedIn } from "../utils/auth";

type Props = { children: ReactNode };

export default function ProtectedRoute({ children }: Props) {
    const loc = useLocation();
    if (!isLoggedIn()) {
        const next = encodeURIComponent(loc.pathname + loc.search);
        return <Navigate to={`/login?next=${next}`} replace />;
    }
    return <>{children}</>;
}
