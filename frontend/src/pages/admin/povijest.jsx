import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function Povijest() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(null);
  const [filter, setFilter] = useState("");

  const getSessionDate = (dateObj) => {
    const d = new Date(dateObj);
    if (d.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const todaySession = getSessionDate(new Date());
  const [startDate, setStartDate] = useState(todaySession);
  const [endDate, setEndDate] = useState(todaySession);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      setTransactions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetToToday = () => {
    setStartDate(todaySession);
    setEndDate(todaySession);
  };

  const exportToExcel = () => {
    const excelData = filteredTransactions.map(t => ({
      "Broj Računa": t.receipt?.invoiceNumber || "N/A",
      "Iznos (€)": parseFloat(t.amount).toFixed(2),
      "Plaćanje": t.receipt?.paymentType || "N/A",
      "Status": t.receipt?.status === 'STORNO' ? 'Storno' : t.receipt?.status === 'RACUN_STORNIRAN' ? 'Otkazano' : 'Gotovo',
      "Prodavač": t.user?.name || "Nepoznato",
      "Datum": new Date(t.createdAt).toLocaleDateString("hr-HR"),
      "Vrijeme": new Date(t.createdAt).toLocaleTimeString("hr-HR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      "Fiskalni Dan": getSessionDate(t.createdAt)
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Izvještaj");
    XLSX.writeFile(workbook, `KSET_Izvjestaj_${startDate}_${endDate}.xlsx`);
  };

  const filteredTransactions = transactions.filter(t => {
    const transactionSessionDay = getSessionDate(t.createdAt);
    const matchesSearch = !filter || 
      t.receipt?.invoiceNumber?.toLowerCase().includes(filter.toLowerCase()) ||
      t.user?.name?.toLowerCase().includes(filter.toLowerCase());
    return matchesSearch && transactionSessionDay >= startDate && transactionSessionDay <= endDate;
  });

  if (loading) return <div style={{ padding: '40px' }}>Učitavanje...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#fdfdfd', minHeight: '100vh', color: '#333' }}>
      
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1a202c' }}>Povijest Transakcija</h1>
        <p style={{ margin: '4px 0', color: '#718096', fontSize: '14px' }}>Pregled prometa i izvoz podataka</p>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px', 
        backgroundColor: '#fff', 
        padding: '15px', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#4a5568' }}>Razdoblje:</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={dateInputStyle} />
          <span style={{ color: '#cbd5e0' }}>—</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={dateInputStyle} />
        </div>

        <button onClick={resetToToday} style={secondaryButtonStyle}>Danas</button>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button onClick={exportToExcel} style={excelButtonStyle}>Export .XLSX</button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Pretraži po broju računa ili prodavaču..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px 15px', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            fontSize: '15px',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#edf2f7', textAlign: 'left' }}>
              <th style={thStyle}>Broj Računa</th>
              <th style={thStyle}>Iznos</th>
              <th style={thStyle}>Plaćanje</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Prodavač</th>
              <th style={thStyle}>Datum</th>
              <th style={thStyle}>Vrijeme</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                <td style={tdStyle}>{t.receipt?.invoiceNumber || "N/A"}</td>
                <td style={{ ...tdStyle, fontWeight: '600' }}>{parseFloat(t.amount).toFixed(2)} €</td>
                <td style={tdStyle}>{t.receipt?.paymentType || "N/A"}</td>
                <td style={tdStyle}>
                  <StatusBadge status={t.receipt?.status} />
                </td>
                <td style={tdStyle}>{t.user?.name || "Sustav"}</td>
                <td style={tdStyle}>
                  {new Date(t.createdAt).toLocaleDateString("hr-HR", {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </td>
                <td style={tdStyle}>
                  {new Date(t.createdAt).toLocaleTimeString("hr-HR", {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block'
  };
  if (status === 'STORNO') return <span style={{ ...styles, backgroundColor: '#fed7d7', color: '#9b2c2c' }}>Storno</span>;
  if (status === 'RACUN_STORNIRAN') return <span style={{ ...styles, backgroundColor: '#feebc8', color: '#9c4221' }}>Otkazano</span>;
  return <span style={{ ...styles, backgroundColor: '#c6f6d5', color: '#22543d' }}>Gotovo</span>;
}

const thStyle = { padding: '15px', fontSize: '14px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '15px', fontSize: '15px' };
const dateInputStyle = { padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', cursor: 'pointer' };
const secondaryButtonStyle = { backgroundColor: '#edf2f7', border: '1px solid #cbd5e0', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#4a5568' };
const excelButtonStyle = { backgroundColor: '#2f855a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };