import { useState, useEffect } from "react";
import "../styles/Pages.css";

export default function Izvjestaj() {
  const [transactions, setTransactions] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transRes, recRes] = await Promise.all([
        fetch("http://localhost:3000/api/transactions", {
          credentials: "include",
        }),
        fetch("http://localhost:3000/api/receipts", {
          credentials: "include",
        }),
      ]);

      const transactions = await transRes.json();
      const receipts = await recRes.json();

      if (!transRes.ok || !Array.isArray(transactions)) {
        console.error("Transactions API error or invalid data:", transactions);
        setTransactions([]);
      } else {
        setTransactions(transactions);
      }

      if (!recRes.ok || !Array.isArray(receipts)) {
        console.error("Receipts API error or invalid data:", receipts);
        setReceipts([]);
      } else {
        setReceipts(receipts);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setTransactions([]);
      setReceipts([]);
      setLoading(false);
    }
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const receiptCount = receipts.filter(r => !r.isCancelled).length;

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <div className="report-header">
        <h1>Izvještaj - Prodaja</h1>
        <button onClick={() => window.print()} className="btn-primary">
          Ispiši Izvještaj
        </button>
      </div>

      <div className="report-summary">
        <div className="summary-card">
          <h3>Ukupna Prodaja</h3>
          <p className="big-number">€{totalAmount.toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h3>Broj Računa</h3>
          <p className="big-number">{receiptCount}</p>
        </div>
        <div className="summary-card">
          <h3>Prosječna Vrijednost</h3>
          <p className="big-number">
            €{receiptCount > 0 ? (totalAmount / receiptCount).toFixed(2) : "0.00"}
          </p>
        </div>
      </div>

      <div className="report-table">
        <h2>Detalji Transakcija</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Broj Računa</th>
              <th>Iznos</th>
              <th>Prodavač</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(transaction => (
              <tr key={transaction.id}>
                <td>{transaction.receipt?.broj || "N/A"}</td>
                <td>€{transaction.amount.toFixed(2)}</td>
                <td>{transaction.user?.name || "N/A"}</td>
                <td>
                  {new Date(transaction.receipt?.datum).toLocaleDateString("hr-HR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
