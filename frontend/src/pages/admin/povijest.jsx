import { useState, useEffect } from "react";
import "../../styles/Pages.css";

export default function povijest() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/transactions", {
        credentials: "include",
      });
      const data = await response.json();
      setTransactions(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (!filter) return true;
    return (
      t.receipt?.broj?.toLowerCase().includes(filter.toLowerCase()) ||
      t.user?.name?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <h1>Povijest Transakcija</h1>

      <div className="filter-container">
        <input
          type="text"
          placeholder="Pretraži po broju računa ili prodavaču..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Broj Računa</th>
              <th>Iznos (€)</th>
              <th>Prodavač</th>
              <th>Datum</th>
              <th>Vrijeme</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(transaction => (
              <tr key={transaction.id}>
                <td className="monospace">{transaction.id.slice(0, 8)}...</td>
                <td>{transaction.receipt?.broj || "N/A"}</td>
                <td className="text-right">€{transaction.amount.toFixed(2)}</td>
                <td>{transaction.user?.name || "N/A"}</td>
                <td>
                  {new Date(transaction.createdAt).toLocaleDateString("hr-HR")}
                </td>
                <td>
                  {new Date(transaction.createdAt).toLocaleTimeString("hr-HR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary">
        <p>Ukupno transakcija: <strong>{filteredTransactions.length}</strong></p>
        <p>
          Ukupni iznos: <strong>€{filteredTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</strong>
        </p>
      </div>
    </div>
  );
}
