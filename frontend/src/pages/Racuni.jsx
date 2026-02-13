import { useState, useEffect } from "react";
import "../styles/Pages.css";

export default function Racuni() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredReceipts = receipts.filter(receipt => {
    const searchLower = searchTerm.toLowerCase();
    return (
      receipt.broj.toLowerCase().includes(searchLower) ||
      receipt.nacinPlacanja.toLowerCase().includes(searchLower) ||
      receipt.kreator?.name?.toLowerCase().includes(searchLower) ||
      receipt.ukupno.toString().includes(searchLower)
    );
  });

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
    <>
      <style>{`
        @media print {
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; }
          #root { width: 100%; margin: 0; padding: 0; }
          .sidebar { display: none !important; }
          .main-layout { display: block !important; margin: 0; padding: 0; }
          .main-content { margin: 0 !important; padding: 20px !important; width: 100% !important; background: white !important; }
          .page-container { max-width: 100%; margin: 0; padding: 0; background: white; }
          input[type="text"] { display: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    <div className="page-container">
      <h1>Računi</h1>
      
      <input
        type="text"
        placeholder="Pretraži račune (broj, način plaćanja, prodavač, iznos)..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '20px',
          borderRadius: '5px',
          border: '1px solid #ddd',
          fontSize: '14px',
          boxSizing: 'border-box'
        }}
      />

      <div style={{color: '#666', marginBottom: '15px'}}>
        Pronađeno: {filteredReceipts.length} od {receipts.length} računa
      </div>

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
            {filteredReceipts.map(receipt => (
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
    </>
  );
}
