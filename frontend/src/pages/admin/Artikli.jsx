import { useState, useEffect } from "react";
import "../../styles/Pages.css";

export default function Artikli() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    kpdSifra: "",
    brutIznos: 0,
    pdv: 0,
    opis: "",
    active: true,
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/articles", {
        credentials: "include",
      });
      const data = await response.json();
      setArticles(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching articles:", error);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      kpdSifra: "",
      brutIznos: 0,
      pdv: 0,
      opis: "",
      active: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `http://localhost:3000/api/articles/${editingId}`
        : "http://localhost:3000/api/articles";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingId ? "Artikl je ažuriran!" : "Artikl je kreiran!");
        resetForm();
        setShowForm(false);
        fetchArticles();
      }
    } catch (error) {
      console.error("Error saving article:", error);
    }
  };

  const handleEdit = (article) => {
    setFormData(article);
    setEditingId(article.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sigurno želite obrisati ovaj artikl?")) {
      try {
        const response = await fetch(`http://localhost:3000/api/articles/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          alert("Artikl je obrisan!");
          fetchArticles();
        }
      } catch (error) {
        console.error("Error deleting article:", error);
      }
    }
  };

  const toggleActive = async (id, currentActive) => {
    try {
      const article = articles.find(a => a.id === id);
      await fetch(`http://localhost:3000/api/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...article, active: !currentActive }),
      });
      fetchArticles();
    } catch (error) {
      console.error("Error toggling article:", error);
    }
  };

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Upravljanje Artiklima</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn-primary"
        >
          {showForm ? "Otkaži" : "Novi Artikl"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label>Naziv:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Kod:</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>KPD Šifra:</label>
            <input
              type="text"
              value={formData.kpdSifra}
              onChange={(e) => setFormData({ ...formData, kpdSifra: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Bruto Iznos (€):</label>
            <input
              type="number"
              step="0.01"
              value={formData.brutIznos}
              onChange={(e) =>
                setFormData({ ...formData, brutIznos: parseFloat(e.target.value) })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>PDV (%):</label>
            <input
              type="number"
              step="0.01"
              value={formData.pdv}
              onChange={(e) => setFormData({ ...formData, pdv: parseFloat(e.target.value) })}
              required
            />
          </div>
          <div className="form-group">
            <label>Opis:</label>
            <textarea
              value={formData.opis}
              onChange={(e) => setFormData({ ...formData, opis: e.target.value })}
            ></textarea>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              Aktivan
            </label>
          </div>
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
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Naziv</th>
              <th>Kod</th>
              <th>KPD Šifra</th>
              <th>Cijena (€)</th>
              <th>PDV (%)</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {articles.map(article => (
              <tr key={article.id} className={!article.active ? "inactive" : ""}>
                <td>{article.name}</td>
                <td>{article.code}</td>
                <td>{article.kpdSifra}</td>
                <td>€{article.brutIznos.toFixed(2)}</td>
                <td>{article.pdv}%</td>
                <td>
                  <span className={`badge-${article.active ? "success" : "danger"}`}>
                    {article.active ? "Aktivan" : "Neaktivan"}
                  </span>
                </td>
                <td className="actions">
                  <button
                    onClick={() => handleEdit(article)}
                    className="btn-small btn-primary"
                  >
                    Uredi
                  </button>
                  <button
                    onClick={() => toggleActive(article.id, article.active)}
                    className={`btn-small ${article.active ? "btn-warning" : "btn-info"}`}
                  >
                    {article.active ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
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
