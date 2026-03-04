import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Splash() {
  const nav = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      nav("/login");
    }, 2000);
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-black">
      <img src="/logo.png" className="w-40" />
    </div>
  );
}