import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import MainLayout from "./layouts/MainLayout";
import Prodaja from "./pages/Prodaja";
import Racuni from "./pages/Racuni";
import Izvjestaj from "./pages/Izvjestaj";
import UkupniIzvjestaj from "./pages/admin/UkupniIzvjestaj";
import Artikli from "./pages/admin/Artikli";
import povijest from "./pages/admin/povijest";
import Korisnici from "./pages/admin/Korisnici";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Home />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Main Application Routes */}
        <Route
          path="/prodaja"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Prodaja />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/racuni"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Racuni />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/izvjestaj"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Izvjestaj />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/ukupni-izvjestaj"
          element={
            <ProtectedRoute>
              <MainLayout>
                <UkupniIzvjestaj />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/artikli"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Artikli />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/povijest"
          element={
            <ProtectedRoute>
              <MainLayout>
                <povijest />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/korisnici"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Korisnici />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
