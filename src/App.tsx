import AppRoutes from "./routes/AppRoutes";
import RevealObserver from "./components/RevealObserver";
import ToastViewport from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <RevealObserver />
      <ToastViewport />
      <AppRoutes />
    </ErrorBoundary>
  );
}
