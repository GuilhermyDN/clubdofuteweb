import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Eu from "../pages/Eu";
import EquipeDetalhe from "../pages/EquipeDetalhe";
import PartidaDetalhePage from "../pages/PartidaDetalhe";
import EquipePartidasPage from "../pages/EquipePartidas";
import EquipesPage from "../pages/EquipesPage";
import PartidaAvaliacaoPage from "../pages/PartidaAvaliacao";
import Beneficios from "../pages/Beneficios";
import Modalidades from "../pages/Modalidades";
import ComoFunciona from "../pages/ComoFunciona";
import ProtectedRoute from "../components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/beneficios" element={<Beneficios />} />
        <Route path="/modalidades" element={<Modalidades />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />

        {/* Autenticado */}
        <Route path="/eu" element={<ProtectedRoute><Eu /></ProtectedRoute>} />
        <Route path="/equipes" element={<ProtectedRoute><EquipesPage /></ProtectedRoute>} />
        <Route path="/equipes/:equipeId" element={<ProtectedRoute><EquipeDetalhe /></ProtectedRoute>} />
        <Route path="/equipes/:equipeId/partidas" element={<ProtectedRoute><EquipePartidasPage /></ProtectedRoute>} />
        <Route path="/partidas/:partidaId" element={<ProtectedRoute><PartidaDetalhePage /></ProtectedRoute>} />
        <Route path="/partidas/:partidaId/avaliar" element={<ProtectedRoute><PartidaAvaliacaoPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
