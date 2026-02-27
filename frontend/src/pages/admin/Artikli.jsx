import { useState, useEffect } from "react";
import "../../styles/Pages.css";

export default function Artikli() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    productCode: "",
    kpdCode: "",
    price: 0,
    taxRate: 0,
    description: "",
    categoryId: "",
    active: true,
  });

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/articles`, {
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

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/articles`, { credentials: "include" });
        const data = await response.json();
        setArticles(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching articles:", error);
        setLoading(false);
      }
    })();
    (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`, { credentials: "include" });
        const data = await response.json();
        if (Array.isArray(data)) setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    })();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      productCode: "",
      kpdCode: "",
      price: 0,
      taxRate: 0,
      description: "",
      categoryId: "",
      active: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `${import.meta.env.VITE_API_URL}/api/articles/${editingId}`
        : `${import.meta.env.VITE_API_URL}/api/articles`;
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
    setFormData({ ...article, categoryId: article.categoryId || "" });
    setEditingId(article.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sigurno želite obrisati ovaj artikl?")) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/articles/${id}`, {
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
      await fetch(`${import.meta.env.VITE_API_URL}/api/articles/${id}`, {
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
              value={formData.productCode}
              onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>KPD Šifra:</label>
            <input
              type="text"
              value={formData.kpdCode}
              onChange={(e) => setFormData({ ...formData, kpdCode: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Bruto Iznos (€):</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>PDV (%):</label>
            <input
              type="number"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
              required
            />
          </div>
          <div className="form-group">
            <label>Opis:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
          </div>
          <div className="form-group">
            <label>Kategorija:</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              <option value="">-- Odaberi kategoriju --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
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
              <th>Kategorija</th>
              <th>Aktivan</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {articles.map(article => (
              <tr key={article.id} className={!article.active ? "inactive" : ""}>
                <td>{article.name}</td>
                <td>{article.productCode}</td>
                <td>{article.kpdCode}</td>
                <td><span className="currency">{parseFloat(article.price).toFixed(2)}</span></td>
                <td>{article.taxRate}%</td>
                <td>{categories.find(c => c.id === article.categoryId)?.name || "-"}</td>
                <td>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={article.active}
                      onChange={() => toggleActive(article.id, article.active)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </td>
                <td className="actions">
                  <button
                    onClick={() => handleEdit(article)}
                    className="icon-btn edit"
                    title="Uredi"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="icon-btn delete"
                    title="Obriši"
                  >
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