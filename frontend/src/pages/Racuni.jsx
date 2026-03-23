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
      // ENDPOINT ZA VRIJEME
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/current-session`, {
        credentials: "include",
      });
      const data = await response.json();
      //console.log("Struktura prvog računa:", data[0]); // POGLEDAJ OVO U KONZOLI
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
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/${receiptId}/storno`, {
          method: "PUT",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Storno failed");
        
        // Osvježavamo listu nakon storniranja
        fetchReceipts();
        
        // Automatski ispis storno računa
        const stornoData = await res.json();
        const printRes = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/${stornoData.id}/print`, {
          credentials: "include",
        });
        if (printRes.ok) setPrintData(await printRes.json());
      } catch (error) {
        console.error("Error cancelling receipt:", error);
        alert("Greška pri storniranju računa");
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

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje sesije...</div>;

  return (
    <>
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1>Računi (Trenutna sesija)</h1>
        <button onClick={fetchReceipts} className="btn-small" style={{ background: '#eee' }}>Osvježi ↻</button>
      </div>

      <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '5px', marginBottom: '20px', fontSize: '13px', color: '#666', border: '1px solid #eee' }}>
        Prikazuju se računi od <strong>06:00h</strong> danas do kraja smjene.
      </div>
      
      <input
        type="text"
        placeholder="Pretraži račune u ovoj sesiji po bilo čemu (Broj, Plaćanje, Cijena, Prodavač)..."
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
        Pronađeno: {filteredReceipts.length} računa
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Broj računa</th>
              <th>Vrijeme</th>
              <th>Prodajno mjesto</th>
              <th>Plaćanje</th>
              <th>Ukupno</th>
              <th>Prodavač</th>
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
                  <td><strong>{receipt.invoiceNumber}</strong></td>
                  <td>
                    {new Date(receipt.createdAt).toLocaleTimeString("hr-HR", {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                  </td>
                  <td>{receipt.prodajnoMjestoNaziv || "N/A"}</td>
                  <td>{receipt.paymentType}</td>
                  <td><span className="currency">{parseFloat(receipt.brutto).toFixed(2)}</span></td>
                  <td>
                    {receipt.user?.name || 
                    receipt.userName || 
                    JSON.parse(localStorage.getItem("user"))?.name || 
                    "N/A"}
                  </td>
                  <td>
                    {receipt.status === 'STORNO' && <span className="badge-danger">Storno</span>}
                    {receipt.status === 'RACUN_STORNIRAN' && <span className="badge-danger">Otkazan</span>}
                    {receipt.status === 'RACUN' && <span className="badge-success">Aktivan</span>}
                  </td>
                  <td className="actions">
                    <button onClick={() => handlePrint(receipt.id)} className="btn-small btn-primary">Ispiši</button>
                    {receipt.status === 'RACUN' && (
                      <button onClick={() => handleStorno(receipt.id)} className="btn-small btn-danger">Storno</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredReceipts.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Nema izdanih računa u ovoj sesiji.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Print Logic */}
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