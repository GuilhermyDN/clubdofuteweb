import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Eu from "../pages/Eu";
import HomeLogado from "../pages/HomeLogado";
import EquipeDetalhe from "../pages/EquipeDetalhe";
import PartidaDetalhePage from "../pages/PartidaDetalhe";
import EquipePartidasPage from "../pages/EquipePartidas";
import EquipeDetalhePage from "../pages/EquipeDetalhe";
import EquipesPage from "../pages/EquipesPage";
import PartidaAvaliacaoPage from "../pages/PartidaAvaliacao";
import Beneficios from "../pages/Beneficios";
import Modalidades from "../pages/Modalidades";
import ComoFunciona from "../pages/ComoFunciona";


export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/eu" element={<Eu />} />
        <Route path="/home-logado" element={<HomeLogado />} />
        <Route path="/equipes/:equipeId" element={<EquipeDetalhe />} />
        <Route path="/partidas/:partidaId" element={<PartidaDetalhePage />} />
        <Route path="/equipes/:equipeId/partidas" element={<EquipePartidasPage />} />
        <Route path="/partidas/:partidaId" element={<PartidaDetalhePage />} />
        <Route path="/equipes/:equipeId" element={<EquipeDetalhePage />} />
        <Route path="/equipes" element={<EquipesPage />} />
        <Route path="/partidas/:partidaId/avaliar" element={<PartidaAvaliacaoPage />} />
        <Route path="/beneficios" element={<Beneficios />} />
        <Route path="/modalidades" element={<Modalidades />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />
      </Routes>
    </BrowserRouter>
  );
}