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
        fetch(`${import.meta.env.VITE_API_URL}/api/transactions`, {
          credentials: "include",
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/receipts`, {
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

  // Filter za odabrani datum - SVE račune (i aktivne i stornirane)
  const dayReceipts = receipts.filter(r => {
    const rDate = new Date(r.createdAt).toISOString().split('T')[0];
    return rDate === selectedDate;
  }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Samo računi bez storno statusa za vremenske granice i brojanje
  const positiveReceipts = dayReceipts.filter(r => r.status !== 'STORNO');
  const startTime = positiveReceipts.length > 0 ? new Date(positiveReceipts[0].createdAt) : null;
  const endTime = positiveReceipts.length > 0 ? new Date(positiveReceipts[positiveReceipts.length - 1].createdAt) : null;

  const invoiceNumbers = positiveReceipts.map(r => r.invoiceNumber);
  const minReceiptNum = invoiceNumbers.length > 0 ? invoiceNumbers[0] : "N/A";
  const maxReceiptNum = invoiceNumbers.length > 0 ? invoiceNumbers[invoiceNumbers.length - 1] : "N/A";

  // Grupiraj artikle po načinu plaćanja - SVE račune uključene u kalkulaciju
  // Storno računi (negativni iznosi) se automatski oduzimaju jer imaju negativne cijene
  const articlesByPayment = {};
  const allArticles = {}; // All articles grouped together regardless of payment method

  dayReceipts.forEach(receipt => {
    const method = receipt.paymentType;

    if (!articlesByPayment[method]) {
      articlesByPayment[method] = {};
    }
    if (receipt.items) {
      receipt.items.forEach(item => {
        const name = item.article?.name || "N/A";

        // Group by payment method
        if (!articlesByPayment[method][name]) {
          articlesByPayment[method][name] = {
            quantity: 0,
            price: item.price,
            total: 0
          };
        }
        articlesByPayment[method][name].quantity += item.quantity;
        articlesByPayment[method][name].total += item.quantity * item.price;

        // Group all articles together
        if (!allArticles[name]) {
          allArticles[name] = {
            quantity: 0,
            price: item.price,
            total: 0
          };
        }
        allArticles[name].quantity += item.quantity;
        allArticles[name].total += item.quantity * item.price;
      });
    }
  });

  // Calculate totals by payment method
  const paymentTotals = {};
  Object.entries(articlesByPayment).forEach(([method, articles]) => {
    paymentTotals[method] = Object.values(articles).reduce((sum, item) => sum + item.total, 0);
  });

  // Calculate grand total
  const grandTotal = Object.values(paymentTotals).reduce((sum, total) => sum + total, 0);

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
          Ispiši ✓
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

      {/* Vremenski raspon i brojevi računa - header section */}
      <div style={{ background: '#ddd', padding: '10px 15px', marginBottom: '10px', fontWeight: '600', color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {startTime && endTime ? (
            <>
              {startTime.toLocaleDateString("hr-HR", { day: '2-digit', month: '2-digit', year: 'numeric' })}, {startTime.toLocaleTimeString("hr-HR", {hour: '2-digit', minute:'2-digit'})} - {endTime.toLocaleDateString("hr-HR", { day: '2-digit', month: '2-digit', year: 'numeric' })}, {endTime.toLocaleTimeString("hr-HR", {hour: '2-digit', minute:'2-digit'})}
            </>
          ) : (
            'Nema računa za odabrani datum'
          )}
        </div>
        <div>{positiveReceipts.length}</div>
      </div>

      {/* Izdanih računa i Brojevi računa */}
      <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '10px', background: 'white'}}>
        <tbody>
          <tr style={{borderBottom: '1px solid #ddd'}}>
            <td style={{padding: '8px 15px', color: '#666'}}>Izdanih računa</td>
            <td style={{padding: '8px 15px', textAlign: 'right', color: '#333'}}></td>
            <td style={{padding: '8px 15px', textAlign: 'right', color: '#333', fontWeight: '600'}}>{positiveReceipts.length}</td>
          </tr>
          <tr style={{borderBottom: '1px solid #ddd'}}>
            <td style={{padding: '8px 15px', color: '#666'}}>Brojevi računa</td>
            <td style={{padding: '8px 15px', textAlign: 'right', color: '#333'}}></td>
            <td style={{padding: '8px 15px', textAlign: 'right', color: '#333'}}>{positiveReceipts.length > 0 ? `${minReceiptNum ?? 'N/A'} do ${maxReceiptNum ?? 'N/A'}` : 'N/A'}</td>
          </tr>
        </tbody>
      </table>

      {/* Articles table */}
      <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '10px', background: 'white'}}>
        <thead>
          <tr style={{background: '#ddd'}}>
            <th style={{padding: '8px 15px', textAlign: 'left', color: '#333', fontWeight: '600'}}>Artikli</th>
            <th style={{padding: '8px 15px', textAlign: 'center', color: '#333', fontWeight: '600'}}>Količina</th>
            <th style={{padding: '8px 15px', textAlign: 'right', color: '#333', fontWeight: '600'}}>Suma</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(allArticles).map(([name, data]) => (
            <tr key={name} style={{borderBottom: '1px solid #ddd'}}>
              <td style={{padding: '8px 15px', color: '#333'}}>{name}</td>
              <td style={{padding: '8px 15px', textAlign: 'center', color: '#333'}}>{data.quantity}</td>
              <td style={{padding: '8px 15px', textAlign: 'right', color: '#333'}}><span className="currency">{Math.abs(data.total).toFixed(0)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Grand total row */}
      <div style={{background: '#ddd', padding: '10px 15px', marginBottom: '10px', textAlign: 'right', fontWeight: '600', color: '#333'}}>
        <span className="currency">{Math.abs(grandTotal).toFixed(0)}</span>
      </div>

      {/* Payment method breakdown header */}
      <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '10px', background: 'white'}}>
        <thead>
          <tr style={{background: '#ddd'}}>
            <th style={{padding: '8px 15px', textAlign: 'left', color: '#333', fontWeight: '600'}}>Način plaćanja</th>
            <th style={{padding: '8px 15px', textAlign: 'center', color: '#333', fontWeight: '600'}}>Količina</th>
            <th style={{padding: '8px 15px', textAlign: 'right', color: '#333', fontWeight: '600'}}>Suma</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(articlesByPayment).map(([method, articles]) => {
            const totalQty = Object.values(articles).reduce((sum, item) => sum + item.quantity, 0);
            const totalSum = Object.values(articles).reduce((sum, item) => sum + item.total, 0);
            return (
              <tr key={method} style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '8px 15px', color: '#333'}}>{method}</td>
                <td style={{padding: '8px 15px', textAlign: 'center', color: '#333'}}>{totalQty}</td>
                <td style={{padding: '8px 15px', textAlign: 'right', color: '#333'}}><span className="currency">{Math.abs(totalSum).toFixed(0)}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Grand total row */}
      <div style={{background: '#ddd', padding: '10px 15px', marginBottom: '10px', textAlign: 'right', fontWeight: '600', color: '#333'}}>
        <span className="currency">{Math.abs(grandTotal).toFixed(0)}</span>
      </div>

      {/* Polog summary */}
      <div style={{background: '#FF8C04', padding: '10px 15px', marginBottom: '10px', textAlign: 'right', fontWeight: '600', color: 'white'}}>
        {Object.keys(articlesByPayment)[0]} + Polog: <span className="currency">{(Math.abs(Object.values(paymentTotals)[0] || 0) + 130).toFixed(0)}</span>
      </div>

      {/* Ukupno + Polog */}
      <div style={{background: '#FF8C04', padding: '10px 15px', marginBottom: '20px', textAlign: 'right', fontWeight: '600', color: 'white', fontSize: '16px'}}>
        Ukupno + Polog: <span className="currency">{(Math.abs(grandTotal) + 130).toFixed(0)}</span>
      </div>
    </div>
  );
}
