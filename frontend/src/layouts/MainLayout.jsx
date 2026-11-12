import { useState } from "react";
import Sidebar from "../components/Sidebar";
import "./MainLayout.css";

export default function MainLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="main-layout">
      <header className="mobile-header">
        <span className="mobile-brand">Fiskalna</span>
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "Zatvori izbornik" : "Otvori izbornik"}
          aria-expanded={menuOpen}
          aria-controls="app-navigation"
          onClick={() => setMenuOpen(open => !open)}
        >
          <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
        </button>
      </header>
      {menuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Zatvori izbornik"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Sidebar
        isOpen={menuOpen}
        onNavigate={() => setMenuOpen(false)}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
