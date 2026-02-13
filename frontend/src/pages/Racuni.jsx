import { useState, useEffect } from "react";
import "../styles/Pages.css";

export default function Racuni() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/receipts", {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        console.error("API error or invalid data:", data);
        setReceipts([]);
      } else {
        setReceipts(data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      setReceipts([]);
      setLoading(false);
    }
  };

  const handleStorno = async (receiptId) => {
    if (window.confirm("Sigurno želite otkazati ovaj račun?")) {
      try {
        await fetch(`http://localhost:3000/api/receipts/${receiptId}/storno`, {
          method: "PUT",
          credentials: "include",
        });
        fetchReceipts();
        alert("Račun je otkazan!");
      } catch (error) {
        console.error("Error cancelling receipt:", error);
      }
    }
  };

  const handlePrint = (receiptId) => {
    window.print();
  };

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <h1>Računi</h1>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Broj računa</th>
              <th>Datum</th>
              <th>Način plaćanja</th>
              <th>Ukupno</th>
              <th>Kreirano od</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map(receipt => (
              <tr key={receipt.id} className={receipt.isCancelled ? "cancelled" : ""}>
                <td>{receipt.broj}</td>
                <td>{new Date(receipt.datum).toLocaleDateString("hr-HR")}</td>
                <td>{receipt.nacinPlacanja}</td>
                <td>€{receipt.ukupno.toFixed(2)}</td>
                <td>{receipt.kreator?.name || "N/A"}</td>
                <td>
                  {receipt.isCancelled ? (
                    <span className="badge-danger">Otkazan</span>
                  ) : (
                    <span className="badge-success">Aktivan</span>
                  )}
                </td>
                <td className="actions">
                  <button
                    onClick={() => handlePrint(receipt.id)}
                    className="btn-small btn-primary"
                  >
                    Ispiši
                  </button>
                  {!receipt.isCancelled && (
                    <button
                      onClick={() => handleStorno(receipt.id)}
                      className="btn-small btn-danger"
                    >
                      Storno
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
