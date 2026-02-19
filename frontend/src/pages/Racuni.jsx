import { useState, useEffect } from "react";
import "../styles/Pages.css";
import ReceiptPrintButton from "./admin/Racun";

export default function Racuni() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [printData, setPrintData] = useState(null);


  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts`, {
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
      receipt.invoiceNumber?.toLowerCase().includes(searchLower) ||
      receipt.paymentType.toLowerCase().includes(searchLower) ||
      receipt.user?.name?.toLowerCase().includes(searchLower) ||
      receipt.brutto.toString().includes(searchLower)
    );
  });

  const handleStorno = async (receiptId) => {
    if (window.confirm("Sigurno želite otkazati ovaj račun?")) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/${receiptId}/storno`, {
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

  const handlePrint = async (receiptId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/${receiptId}/print`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch print data");
      const data = await response.json();
      setPrintData(data);
    } catch (error) {
      console.error("Error fetching print data:", error);
      alert("Greška pri dohvaćanju podataka za ispis");
    }
  };


  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <>
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
              <th>Datum i vrijeme</th>
              <th>Način plaćanja</th>
              <th>Ukupno</th>
              <th>Kreirano od</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.map(receipt => {
              const rowClass = receipt.status === 'RACUN_STORNIRAN' ? 'cancelled'
                             : receipt.status === 'STORNO' ? 'storno'
                             : '';
              return (
                <tr key={receipt.id} className={rowClass}>
                  <td>{receipt.invoiceNumber}</td>
                  <td>
                    {new Date(receipt.createdAt).toLocaleDateString("hr-HR")} {new Date(receipt.createdAt).toLocaleTimeString("hr-HR", {hour: '2-digit', minute: '2-digit'})}
                  </td>
                  <td>{receipt.paymentType}</td>
                  <td><span className="currency">{receipt.brutto.toFixed(2)}</span></td>
                  <td>{receipt.user?.name || "N/A"}</td>
                  <td>
                    {receipt.status === 'STORNO' && (
                      <span className="badge-danger">Storno</span>
                    )}
                    {receipt.status === 'RACUN_STORNIRAN' && (
                      <span className="badge-danger">Otkazan</span>
                    )}
                    {receipt.status === 'RACUN' && (
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
                    {receipt.status === 'RACUN' && (
                      <button
                        onClick={() => handleStorno(receipt.id)}
                        className="btn-small btn-danger"
                      >
                        Storno
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* Print Modal */}
    {printData && (
      <div style={{ display: 'none' }}>
        <ReceiptPrintButton
          order={printData}
          autoPrint
          onAfterPrint={() => setPrintData(null)}
        />
      </div>
    )}
    </>
  );
}
