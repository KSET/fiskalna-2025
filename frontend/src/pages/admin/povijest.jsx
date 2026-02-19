import { useState, useEffect } from "react";

export default function Povijest() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(`Greška servera: ${response.status}`);
        setTransactions([]);
      } else if (!Array.isArray(data)) {
        setError("Primljeni podaci nisu u ispravnom formatu.");
        setTransactions([]);
      } else {
        setTransactions(data);
        setError(null);
      }
    } catch (error) {
      setError(`Neuspješno povezivanje sa serverom: ${error.message}`);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtriranje transakcija prema broju računa ili imenu prodavača
  const filteredTransactions = transactions.filter(t => {
    if (!filter) return true;
    return (
      t.receipt?.invoiceNumber?.toLowerCase().includes(filter.toLowerCase()) ||
      t.user?.name?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  // Prikaz učitavanja
  if (loading) {
    return (
      <div style={{ padding: '40px', backgroundColor: '#ffffff', color: '#333', fontSize: '18px' }}>
        <div>Učitavanje podataka...</div>
      </div>
    );
  }

  // Prikaz u slučaju pogreške
  if (error) {
    return (
      <div style={{ padding: '40px', backgroundColor: '#ffffff', color: '#333', fontSize: '18px' }}>
        <div style={{ color: '#d32f2f', fontWeight: 'bold', marginBottom: '20px', fontSize: '20px' }}>
          GREŠKA
        </div>
        <div style={{ color: '#d32f2f', marginBottom: '20px', fontFamily: 'monospace', backgroundColor: '#ffebee', padding: '15px', borderRadius: '5px' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#ffffff', color: '#333' }}>
      <h1 style={{ marginBottom: '20px', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
        Povijest Transakcija
      </h1>

      {/* Tražilica */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Pretraži po broju računa ili prodavaču..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            fontSize: '14px',
            boxSizing: 'border-box',
            color: '#333'
          }}
        />
      </div>

      {/* Tablica transakcija */}
      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: '#fff',
          border: '1px solid #ddd'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: '600' }}>ID</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: '600' }}>Broj Računa</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: '600' }}>Iznos (€)</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: '600' }}>Prodavač</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: '600' }}>Datum</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: '600' }}>Vrijeme</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map(transaction => (
                <tr key={transaction.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', color: '#333', fontFamily: 'monospace' }}>
                    {transaction.id.slice(0, 8)}...
                  </td>
                  <td style={{ padding: '12px', color: '#333' }}>
                    {transaction.receipt?.invoiceNumber || "N/A"}
                  </td>
                  <td style={{ padding: '12px', color: '#333', textAlign: 'right' }}>
                    <span className="currency">{transaction.amount.toFixed(2)}</span>
                  </td>
                  <td style={{ padding: '12px', color: '#333' }}>
                    {transaction.user?.name || "Nepoznato"}
                  </td>
                  <td style={{ padding: '12px', color: '#333' }}>
                    {new Date(transaction.createdAt).toLocaleDateString("hr-HR")}
                  </td>
                  <td style={{ padding: '12px', color: '#333' }}>
                    {new Date(transaction.createdAt).toLocaleTimeString("hr-HR")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  Nema pronađenih transakcija
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sažetak na dnu stranice */}
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', color: '#333' }}>
        <p style={{ margin: '8px 0' }}>
          <strong>Ukupno transakcija:</strong> {filteredTransactions.length}
        </p>
        <p style={{ margin: '8px 0' }}>
          <strong>Ukupni iznos:</strong> <span className="currency">{filteredTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
        </p>
      </div>

      {/* Stilovi za ispis */}
      <style>{`
        @media print {
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; }
          input[type="text"] { display: none !important; }
          div[style*="background-color: #f5f5f5"] { border: 1px solid #ddd; }
        }
      `}</style>
    </div>
  );
}