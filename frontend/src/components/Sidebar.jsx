import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Sidebar.css";

export default function Sidebar() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [expandAdmin, setExpandAdmin] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/auth/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null));

    fetch("http://localhost:3000/api/categories", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data.filter(c => c.active));
      })
      .catch(() => setCategories([]));
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await fetch("http://localhost:3000/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/";
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Fiskalna</h1>
        {user && <p className="user-name">{user.name}</p>}
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="section-title">Prodaja</h3>
          <Link
            to="/prodaja"
            className={`nav-link ${isActive("/prodaja") && !location.search ? "active" : ""}`}
          >
            Sve
          </Link>
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/prodaja?category=${cat.id}`}
              className={`nav-link ${location.search === `?category=${cat.id}` ? "active" : ""}`}
              style={{ paddingLeft: '2rem', fontSize: '0.9em' }}
            >
              {cat.name}
            </Link>
          ))}
          <Link
            to="/racuni"
            className={`nav-link ${isActive("/racuni") ? "active" : ""}`}
          >
            Računi
          </Link>
          <Link
            to="/izvjestaj"
            className={`nav-link ${isActive("/izvjestaj") ? "active" : ""}`}
          >
            Izvještaj
          </Link>
        </div>

        {user && user.role === "ADMIN" && (
          <div className="nav-section admin-section">
            <button
              className="admin-toggle"
              onClick={() => setExpandAdmin(!expandAdmin)}
            >
              Admin {expandAdmin ? "▼" : "▶"}
            </button>
            {expandAdmin && (
              <>
                <Link
                  to="/admin/ukupni-izvjestaj"
                  className={`nav-link ${
                    isActive("/admin/ukupni-izvjestaj") ? "active" : ""
                  }`}
                >
                  Ukupni izvještaj
                </Link>
                <Link
                  to="/admin/artikli"
                  className={`nav-link ${
                    isActive("/admin/artikli") ? "active" : ""
                  }`}
                >
                  Artikli
                </Link>
                <Link
                  to="/admin/kategorije"
                  className={`nav-link ${isActive("/admin/kategorije") ? "active" : ""}`}
                >
                  Kategorije
                </Link>
                <Link
                  to="/admin/povijest"
                  className={`nav-link ${
                    isActive("/admin/povijest") ? "active" : ""
                  }`}
                >
                  Povijest transakcija
                </Link>
                <Link
                  to="/admin/korisnici"
                  className={`nav-link ${
                    isActive("/admin/korisnici") ? "active" : ""
                  }`}
                >
                  Korisnici
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          Odjava
        </button>
      </div>
    </div>
  );
}
