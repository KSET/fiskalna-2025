// frontend/src/pages/admin/Kategorije.jsx

import { useState, useEffect, useCallback } from "react";
import "../../styles/Pages.css";

export default function Kategorije() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    active: true,
  });

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
        credentials: "include",
      });
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
      setLoading(false);
    }
  }, []);

useEffect(() => {
    const loadData = async () => {
      await fetchCategories();
    };
    loadData();
  }, [fetchCategories]);

  const resetForm = () => {
    setFormData({
      name: "",
      active: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `${import.meta.env.VITE_API_URL}/api/categories/${editingId}`
        : `${import.meta.env.VITE_API_URL}/api/categories`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingId ? "Kategorija je ažurirana!" : "Kategorija je kreirana!");
        resetForm();
        setShowForm(false);
        fetchCategories();
      }
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name,
      active: category.active,
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sigurno želite obrisati ovu kategoriju?")) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          alert("Kategorija je obrisana!");
          fetchCategories();
        }
      } catch (error) {
        console.error("Error deleting category:", error);
      }
    }
  };

  const toggleActive = async (id, currentActive) => {
    try {
      const category = categories.find(c => c.id === id);
      await fetch(`${import.meta.env.VITE_API_URL}/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...category, active: !currentActive }),
      });
      fetchCategories();
    } catch (error) {
      console.error("Error toggling category:", error);
    }
  };

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Upravljanje Kategorijama</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn-primary"
        >
          {showForm ? "Otkaži" : "Nova Kategorija"}
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
            <label>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              Aktivna
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
              <th>Aktivna</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.id} className={!category.active ? "inactive" : ""}>
                <td>{category.name}</td>
                <td>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={category.active}
                      onChange={() => toggleActive(category.id, category.active)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </td>
                <td className="actions">
                  <button
                    onClick={() => handleEdit(category)}
                    className="icon-btn edit"
                    title="Uredi"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
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
