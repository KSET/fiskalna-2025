import { useState, useEffect } from "react";
import "../..//styles/Pages.css";

export default function UkupniIzvjestaj() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    totalSalesAmount: 0,
    invoiceCount: 0,
    description: "",
  });

  const fetchReports = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reports`, {
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

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reports`, { credentials: "include" });
        const data = await response.json();
        setReports(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setLoading(false);
      }
    })();
  }, []);

  const handleCreateReport = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Izvještaj je kreiran!");
        setFormData({
          date: new Date().toISOString().split("T")[0],
          totalSalesAmount: 0,
          invoiceCount: 0,
          description: "",
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
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Ukupno Prodano (€):</label>
            <input
              type="number"
              step="0.01"
              value={formData.totalSalesAmount}
              onChange={(e) =>
                setFormData({ ...formData, totalSalesAmount: parseFloat(e.target.value) })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Broj Računa:</label>
            <input
              type="number"
              value={formData.invoiceCount}
              onChange={(e) =>
                setFormData({ ...formData, invoiceCount: parseInt(e.target.value) })
              }
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
                <td>{new Date(report.date).toLocaleDateString("hr-HR")}</td>
                <td><span className="currency">{report.totalSalesAmount.toFixed(2)}</span></td>
                <td>{report.invoiceCount}</td>
                <td>{report.description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}