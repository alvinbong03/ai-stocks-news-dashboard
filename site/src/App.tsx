import { HashRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import ThemeDashboard from "./pages/ThemeDashboard";
import Methodology from "./pages/Methodology";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/theme/:slug" element={<ThemeDashboard />} />
        <Route path="/methodology" element={<Methodology />} />
      </Routes>
    </HashRouter>
  );
}