import { useState, useEffect } from "react";
import "../../styles/Pages.css";

export default function ProdajnaMjesta() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [savingActive, setSavingActive] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    businessSpace: "",
    paymentDevice: "",
    firaApiKey: "",
    active: true,
  });

  const refreshData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/prodajna-mjesta`, {
        credentials: "include",
      });
      const data = await response.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error refreshing locations:", error);
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/prodajna-mjesta`, {
          credentials: "include",
        });
        const data = await response.json();
        setLocations(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocations([]);
        setLoading(false);
      }
    };

    fetchLocations();

    fetch(`${import.meta.env.VITE_API_URL}/api/settings/active-location`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setActiveLocationId(data.selectedProdajnoMjestoId ?? null))
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      businessSpace: "",
      paymentDevice: "",
      firaApiKey: "",
      active: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `${import.meta.env.VITE_API_URL}/api/prodajna-mjesta/${editingId}`
        : `${import.meta.env.VITE_API_URL}/api/prodajna-mjesta`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingId ? "Prodajno mjesto je ažurirano!" : "Prodajno mjesto je kreirano!");
        resetForm();
        setShowForm(false);
        refreshData();
      }
    } catch (error) {
      console.error("Error saving location:", error);
    }
  };

  const handleEdit = (loc) => {
    setFormData({
      name: loc.name,
      businessSpace: loc.businessSpace,
      paymentDevice: loc.paymentDevice,
      firaApiKey: loc.firaApiKey || "",
      active: loc.active,
    });
    setEditingId(loc.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sigurno želite obrisati ovo prodajno mjesto?")) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/prodajna-mjesta/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          alert("Prodajno mjesto je obrisano!");
          refreshData();
        }
      } catch (error) {
        console.error("Error deleting location:", error);
      }
    }
  };

  const toggleActive = async (id, currentActive) => {
    try {
      const location = locations.find(l => l.id === id);
      await fetch(`${import.meta.env.VITE_API_URL}/api/prodajna-mjesta/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...location, active: !currentActive }),
      });
      refreshData();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleSelectActive = async (id) => {
    setSavingActive(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/active-location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prodajnoMjestoId: id }),
      });
      if (response.ok) {
        setActiveLocationId(id);
      }
    } catch (error) {
      console.error("Error setting active location:", error);
    } finally {
      setSavingActive(false);
    }
  };

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Upravljanje Prodajnim Mjestima</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn-primary"
        >
          {showForm ? "Otkaži" : "Novo Prodajno Mjesto"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label>Ime (Naziv):</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="npr. Šank 1"
            />
          </div>

          <div className="form-group">
            <label>Poslovni prostor (Oznaka):</label>
            <input
              type="text"
              value={formData.businessSpace}
              onChange={(e) => setFormData({ ...formData, businessSpace: e.target.value })}
              required
              placeholder="npr. POSLOVNICA_1"
            />
          </div>

          <div className="form-group">
            <label>Naplatni uređaj (Oznaka):</label>
            <input
              type="text"
              value={formData.paymentDevice}
              onChange={(e) => setFormData({ ...formData, paymentDevice: e.target.value })}
              required
              placeholder="npr. BLAGAJNA_1"
            />
          </div>

          <div className="form-group">
            <label>FIRA API Ključ:</label>
            <input
              type="password"
              value={formData.firaApiKey}
              onChange={(e) => setFormData({ ...formData, firaApiKey: e.target.value })}
              required
              placeholder="Unesite ključ"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              {" "}Aktivno
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" className="btn-success">
              {editingId ? "Ažuriraj" : "Spremi"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="btn-secondary"
            >
              Otkaži
            </button>
          </div>
        </form>
      )}

      <div style={{ background: activeLocationId === null ? "#fff3cd" : "#f0f9f0", border: `1px solid ${activeLocationId === null ? "#ffc107" : "#4caf50"}`, borderRadius: "6px", padding: "14px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, color: "#333", whiteSpace: "nowrap" }}>Aktivno prodajno mjesto:</span>
        <select
          value={activeLocationId ?? ""}
          onChange={(e) => handleSelectActive(Number(e.target.value))}
          disabled={savingActive}
          style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.95rem", minWidth: "200px" }}
        >
          {activeLocationId === null && <option value="" disabled>— odaberite —</option>}
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}{!loc.active ? " (neaktivno)" : ""}</option>
          ))}
        </select>
        {savingActive && <span style={{ color: "#888", fontSize: "0.85rem" }}>Spremanje...</span>}
        {!savingActive && activeLocationId === null && (
          <span style={{ color: "#856404", fontSize: "0.85rem" }}>Prodaja nece raditi dok ne odaberete prodajno mjesto.</span>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ime</th>
              <th>Prostor</th>
              <th>Uređaj</th>
              <th>API Ključ</th>
              <th>Aktivno</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {locations.map(loc => (
              <tr key={loc.id} className={!loc.active ? "inactive" : activeLocationId === loc.id ? "active-location" : ""}>
                <td>{loc.name}</td>
                <td><code>{loc.businessSpace}</code></td>
                <td><code>{loc.paymentDevice}</code></td>
                <td><code>{loc.firaApiKey || "-"}</code></td>
                <td>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={loc.active}
                      onChange={() => toggleActive(loc.id, loc.active)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </td>
                <td className="actions">
                  <button onClick={() => handleEdit(loc)} className="icon-btn edit" title="Uredi">
                    <i className="fas fa-edit"></i>
                  </button>
                  <button onClick={() => handleDelete(loc.id)} className="icon-btn delete" title="Obriši">
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}