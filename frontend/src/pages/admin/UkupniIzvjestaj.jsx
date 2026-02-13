import { useState, useEffect } from "react";
import "../..//styles/Pages.css";

export default function UkupniIzvjestaj() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    datum: new Date().toISOString().split("T")[0],
    ukupnoProdano: 0,
    brojRacuna: 0,
    opis: "",
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/reports", {
        credentials: "include",
      });
      const data = await response.json();
      setReports(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setLoading(false);
    }
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3000/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Izvještaj je kreiran!");
        setFormData({
          datum: new Date().toISOString().split("T")[0],
          ukupnoProdano: 0,
          brojRacuna: 0,
          opis: "",
        });
        setShowForm(false);
        fetchReports();
      }
    } catch (error) {
      console.error("Error creating report:", error);
    }
  };

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Ukupni Izvještaji</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? "Otkaži" : "Novi Izvještaj"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateReport} className="form-container">
          <div className="form-group">
            <label>Datum:</label>
            <input
              type="date"
              value={formData.datum}
              onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Ukupno Prodano (€):</label>
            <input
              type="number"
              step="0.01"
              value={formData.ukupnoProdano}
              onChange={(e) =>
                setFormData({ ...formData, ukupnoProdano: parseFloat(e.target.value) })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Broj Računa:</label>
            <input
              type="number"
              value={formData.brojRacuna}
              onChange={(e) =>
                setFormData({ ...formData, brojRacuna: parseInt(e.target.value) })
              }
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
          <button type="submit" className="btn-success">
            Spremi
          </button>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Ukupno Prodano</th>
              <th>Broj Računa</th>
              <th>Opis</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <tr key={report.id}>
                <td>{new Date(report.datum).toLocaleDateString("hr-HR")}</td>
                <td>€{report.ukupnoProdano.toFixed(2)}</td>
                <td>{report.brojRacuna}</td>
                <td>{report.opis || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
