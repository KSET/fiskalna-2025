import { useState, useEffect } from "react";
import "../styles/Pages.css";

export default function Izvjestaj() {
  const [transactions, setTransactions] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Filter za odabrani datum
  const dayReceipts = receipts.filter(r => {
    const rDate = new Date(r.datum).toISOString().split('T')[0];
    return rDate === selectedDate && !r.isCancelled;
  }).sort((a, b) => a.datum - b.datum);

  // Vremenske granice
  const startTime = dayReceipts.length > 0 ? new Date(dayReceipts[0].datum) : null;
  const endTime = dayReceipts.length > 0 ? new Date(dayReceipts[dayReceipts.length - 1].datum) : null;

  // Brojevi računa
  const receiptNumbers = dayReceipts.map(r => r.broj);
  const minReceiptNum = receiptNumbers.length > 0 ? receiptNumbers[0] : "N/A";
  const maxReceiptNum = receiptNumbers.length > 0 ? receiptNumbers[receiptNumbers.length - 1] : "N/A";

  // Grupiraj artikle po načinu plaćanja
  const articlesByPayment = {};
  dayReceipts.forEach(receipt => {
    const method = receipt.nacinPlacanja;
    if (!articlesByPayment[method]) {
      articlesByPayment[method] = {};
    }
    if (receipt.items) {
      receipt.items.forEach(item => {
        const name = item.article?.name || "N/A";
        if (!articlesByPayment[method][name]) {
          articlesByPayment[method][name] = {
            quantity: 0,
            price: item.price,
            total: 0
          };
        }
        articlesByPayment[method][name].quantity += item.quantity;
        articlesByPayment[method][name].total += item.quantity * item.price;
      });
    }
  });

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container" id="report-container">
      <style>{`
        @media print {
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; }
          #root { width: 100%; margin: 0; padding: 0; }
          .sidebar { display: none !important; }
          .main-layout { display: block !important; margin: 0; padding: 0; }
          .main-content { margin: 0 !important; padding: 20px !important; width: 100% !important; background: white !important; }
          .page-container { max-width: 100%; margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
          h1, h2, h3 { page-break-after: avoid; }
          table { width: 100%; }
        }
      `}</style>

      <div className="report-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{margin: 0, color: '#333'}}>Izvještaj</h1>
        <button onClick={handlePrint} className="btn-primary no-print" style={{background: '#667eea', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer'}}>
          Ispiši
        </button>
      </div>

      <div className="no-print" style={{marginBottom: '20px'}}>
        <label style={{color: '#333', fontWeight: '600', marginRight: '10px'}}>Odaberi datum:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px'}}
        />
      </div>

      {/* Vremenski raspon */}
      {startTime && endTime && (
        <div style={{ background: '#e8e8e8', padding: '12px 15px', marginBottom: '20px', borderRadius: '4px', fontWeight: '600', color: '#333' }}>
          {startTime.toLocaleDateString("hr-HR")} {startTime.toLocaleTimeString("hr-HR", {hour: '2-digit', minute:'2-digit'})} - {endTime.toLocaleDateString("hr-HR")} {endTime.toLocaleTimeString("hr-HR", {hour: '2-digit', minute:'2-digit'})}
        </div>
      )}

      {/* Osnovne informacije */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', fontSize: '14px'}}>
        <div>
          <div style={{color: '#666', marginBottom: '5px'}}>Izdanih računa</div>
          <div style={{fontSize: '24px', fontWeight: 'bold', color: '#333'}}>{dayReceipts.length}</div>
        </div>
        <div>
          <div style={{color: '#666', marginBottom: '5px'}}>Brojevi računa</div>
          <div style={{fontSize: '14px', color: '#333'}}>{minReceiptNum} do {maxReceiptNum}</div>
        </div>
      </div>

      {/* Sekcije po načinu plaćanja */}
      {Object.entries(articlesByPayment).map(([method, articles]) => {
        const methodTotal = Object.values(articles).reduce((sum, item) => sum + item.total, 0);
        return (
          <div key={method} style={{marginBottom: '30px'}}>
            <div style={{background: '#e8e8e8', padding: '12px 15px', fontWeight: '600', color: '#333', marginBottom: '10px'}}>
              Način plaćanja
            </div>
            
            <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '10px'}}>
              <thead>
                <tr style={{background: '#667eea', color: 'white'}}>
                  <th style={{padding: '10px 15px', textAlign: 'left'}}>Artikli</th>
                  <th style={{padding: '10px 15px', textAlign: 'center'}}>Količina</th>
                  <th style={{padding: '10px 15px', textAlign: 'right'}}>Suma</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(articles).map(([name, data]) => (
                  <tr key={name} style={{borderBottom: '1px solid #ddd'}}>
                    <td style={{padding: '10px 15px', color: '#333'}}>{name}</td>
                    <td style={{padding: '10px 15px', textAlign: 'center', color: '#333'}}>{data.quantity}</td>
                    <td style={{padding: '10px 15px', textAlign: 'right', color: '#333'}}>€{data.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{background: '#f4a942', padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: 'white', marginBottom: '20px'}}>
              {method} + total: €{methodTotal.toFixed(2)}
            </div>
          </div>
        );
      })}

      {/* Ukupan zbir */}
      {Object.values(articlesByPayment).length > 0 && (
        <div style={{background: '#f4a942', padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: 'white', marginBottom: '20px', fontSize: '16px'}}>
          Ukupno: €{Object.values(articlesByPayment).reduce((sum, method) => sum + Object.values(method).reduce((s, item) => s + item.total, 0), 0).toFixed(2)}
        </div>
      )}
    </div>
  );
}
