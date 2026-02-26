import { useState, useEffect } from "react";
import "../../styles/Pages.css";

export default function ProdajnaMjesta() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [firaApiUrl, setFiraApiUrl] = useState("");
  
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

    fetch(`${import.meta.env.VITE_API_URL}/api/config`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setFiraApiUrl(data.firaApiKey || ""))
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

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Upravljanje Prodajnim Mjestima</h1>
        {firaApiUrl && (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
            FIRA API Key: <code>{firaApiUrl}</code>
          </p>
        )}
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

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ime</th>
              <th>Prostor</th>
              <th>Uređaj</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {locations.map(loc => (
              <tr key={loc.id} className={!loc.active ? "inactive" : ""}>
                <td>{loc.name}</td>
                <td><code>{loc.businessSpace}</code></td>
                <td><code>{loc.paymentDevice}</code></td>
                <td>
                  <span className={`badge-${loc.active ? "success" : "danger"}`}>
                    {loc.active ? "Aktivno" : "Neaktivno"}
                  </span>
                </td>
                <td className="actions">
                  <button
                    onClick={() => handleEdit(loc)}
                    className="btn-small btn-primary"
                  >
                    Uredi
                  </button>
                  <button
                    onClick={() => toggleActive(loc.id, loc.active)}
                    className={`btn-small ${loc.active ? "btn-warning" : "btn-info"}`}
                  >
                    {loc.active ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="btn-small btn-danger"
                  >
                    Obriši
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