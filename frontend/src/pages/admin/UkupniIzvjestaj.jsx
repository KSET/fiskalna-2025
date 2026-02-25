import { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "../../styles/Pages.css";

// Tvoj originalni helper
const fmtDate = (d) => d ? d.toLocaleDateString("hr-HR", { day: '2-digit', month: '2-digit', year: 'numeric' }) + " " + d.toLocaleTimeString("hr-HR", { hour: '2-digit', minute: '2-digit' }) : "N/A";

const IzvjestajReceipt = ({ data }) => {
  const W = 42;
  const line = "─".repeat(W);

  const center = (text) => {
    const pad = Math.max(0, Math.floor((W - text.length) / 2));
    return " ".repeat(pad) + text;
  };
  const rpad = (s, n) => s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
  const lpad = (s, n) => s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s;

  const {
    startTime, endTime, positiveReceipts,
    minReceiptNum, maxReceiptNum,
    allArticles, articlesByPayment, paymentTotals, paymentCounts, grandTotal
  } = data;

  const COL_NAME = 22;
  const COL_QTY  = 5;
  const COL_TOT  = 10;

  const articleLines = Object.entries(allArticles).map(([name, d]) => {
    const nameChunks = [];
    for (let i = 0; i < name.length; i += COL_NAME) nameChunks.push(name.slice(i, i + COL_NAME));
    if (nameChunks.length === 0) nameChunks.push("");
    return nameChunks.map((chunk, i) => {
      if (i < nameChunks.length - 1) return rpad(chunk, COL_NAME) + " ".repeat(COL_QTY + COL_TOT + 2);
      return rpad(chunk, COL_NAME) + lpad(String(d.quantity), COL_QTY) + " " + lpad(d.total.toFixed(2) + " \u20ac", COL_TOT);
    }).join("\n");
  }).join("\n");

  const paymentLines = Object.entries(articlesByPayment).map(([method, articles]) => {
    const count = paymentCounts[method] || 0;
    const totalSum = Object.values(articles).reduce((sum, item) => sum + item.total, 0);
    const methodLabel = rpad(method, COL_NAME);
    return methodLabel + lpad(String(count), COL_QTY) + " " + lpad(totalSum.toFixed(2) + " \u20ac", COL_TOT);
  }).join("\n");

  const firstMethod = Object.keys(paymentTotals)[0];
  const firstMethodTotal = paymentTotals[firstMethod] || 0;

  const s = {
    wrap: { fontFamily: "'Courier New', Courier, monospace", fontSize: "13px", width: "72mm", margin: "0 auto", color: "#000", background: "#fff", padding: "4mm 2mm", fontWeight: "bold" },
    center: { textAlign: "center" },
    big: { fontSize: "18px", fontWeight: "bold" },
    pre: { fontFamily: "inherit", fontSize: "inherit", margin: "0", whiteSpace: "pre", lineHeight: "1.4", fontWeight: "bold" },
  };

  return (
    <div style={s.wrap} className="receipt-wrap">
      <div style={{ ...s.center, marginBottom: "4px" }}>
        <div style={s.big}>SS FER</div>
        <div>Unska 3, 10000 Zagreb, Hrvatska</div>
        <div>blagajnik@kset.org</div>
        <div>OIB: 14504100762</div>
      </div>
      <pre style={s.pre}>{line}</pre>
      <pre style={s.pre}>{center("DNEVNI IZVJEŠTAJ")}</pre>
      <pre style={s.pre}>{line}</pre>
      <pre style={s.pre}>{
`Od:      ${fmtDate(startTime)}
Do:      ${fmtDate(endTime)}
${line}
Izdanih računa:  ${lpad(String(positiveReceipts.length), 6)}
Brojevi računa:  ${positiveReceipts.length > 0 ? `${minReceiptNum} do ${maxReceiptNum}` : "N/A"}
${line}
${rpad("Artikl", COL_NAME)}${lpad("Kol.", COL_QTY)} ${lpad("Iznos", COL_TOT)}
${line}
${articleLines}
${line}
${rpad("UKUPNO", W - COL_TOT - 1)}${lpad(grandTotal.toFixed(2) + " \u20ac", COL_TOT + 1)}
${line}
${rpad("Način plaćanja", COL_NAME)}${lpad("Kol.", COL_QTY)} ${lpad("Iznos", COL_TOT)}
${line}
${paymentLines}
${line}
${rpad("UKUPNO", W - COL_TOT - 1)}${lpad(grandTotal.toFixed(2) + " \u20ac", COL_TOT + 1)}
${line}
${firstMethod ? rpad(firstMethod + " + Polog", W - COL_TOT - 1) + lpad((Math.abs(firstMethodTotal) + 130).toFixed(2) + " \u20ac", COL_TOT + 1) : ""}
${rpad("Ukupno + Polog", W - COL_TOT - 1)}${lpad((Math.abs(grandTotal) + 130).toFixed(2) + " \u20ac", COL_TOT + 1)}
${line}
${center("#fiskalizacija")}`}
      </pre>
    </div>
  );
};

export default function UkupniIzvjestaj() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeDates, setActiveDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const receiptRef = useRef();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/receipts/active-dates`, { credentials: "include" })
      .then(res => res.json())
      .then(data => setActiveDates(data))
      .catch(err => console.error("Error loading active dates:", err));
  }, []);

  const handleDateClick = async (date) => {
    setLoading(true);
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    const dateStr = adjustedDate.toISOString().split('T')[0];

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/range?from=${dateStr}&to=${dateStr}`, { 
        credentials: "include" 
      });
      const data = await res.json();
      setReceipts(Array.isArray(data) ? data : []);
      setSelectedDate(dateStr);
    } catch (error) {
      console.error("Error fetching data:", error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const dayReceipts = [...receipts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const positiveReceipts = dayReceipts.filter(r => r.status !== 'STORNO' && r.status !== 'RACUN_STORNIRAN');  
  const startTime = positiveReceipts.length > 0 ? new Date(positiveReceipts[0].createdAt) : null;
  const endTime = positiveReceipts.length > 0 ? new Date(positiveReceipts[positiveReceipts.length - 1].createdAt) : null;
  const invoiceNumbers = positiveReceipts.map(r => r.invoiceNumber);
  const minReceiptNum = invoiceNumbers.length > 0 ? invoiceNumbers[0] : "N/A";
  const maxReceiptNum = invoiceNumbers.length > 0 ? invoiceNumbers[invoiceNumbers.length - 1] : "N/A";

  const articlesByPayment = {};
  const allArticles = {};
  const paymentCounts = {};

  positiveReceipts.forEach(receipt => {
    const method = receipt.paymentType;
    paymentCounts[method] = (paymentCounts[method] || 0) + 1;
  });

  dayReceipts.forEach(receipt => {
    const method = receipt.paymentType;
    if (!articlesByPayment[method]) articlesByPayment[method] = {};
    if (receipt.items) {
      const sign = receipt.status === 'STORNO' ? -1 : 1;
      receipt.items.forEach(item => {
        const name = item.article?.name || "N/A";
        const qty = sign * parseFloat(item.quantity);
        const total = qty * Math.abs(parseFloat(item.price));
        const updateData = (obj) => {
          if (!obj[name]) obj[name] = { quantity: 0, price: item.price, total: 0 };
          obj[name].quantity += qty;
          obj[name].total += total;
        };
        updateData(articlesByPayment[method]);
        updateData(allArticles);
      });
    }
  });

  const paymentTotals = {};
  Object.entries(articlesByPayment).forEach(([method, articles]) => {
    paymentTotals[method] = Object.values(articles).reduce((sum, item) => sum + item.total, 0);
  });
  const grandTotal = Object.values(paymentTotals).reduce((sum, total) => sum + total, 0);
  const reportData = { startTime, endTime, positiveReceipts, minReceiptNum, maxReceiptNum, allArticles, articlesByPayment, paymentTotals, paymentCounts, grandTotal };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #fff; display: flex; justify-content: center; }
      @media print { @page { margin: 0; size: auto; } }
      .receipt-wrap { width: 100% !important; max-width: 100% !important; font-size: 14px !important; padding: 8mm !important; }
    </style></head><body>${receiptRef.current.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (!selectedDate || loading) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <h1 style={{ marginBottom: '30px', color: '#333' }}>Arhiva Izvještaja</h1>
        {loading ? (
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Učitavanje podataka...</div>
        ) : (
          <div className="calendar-wrapper">
            <Calendar 
              onClickDay={handleDateClick}
              tileClassName={({ date, view }) => {
                const now = new Date();
                const isToday = date.getDate() === now.getDate() && 
                                date.getMonth() === now.getMonth() && 
                                date.getFullYear() === now.getFullYear();

                const dStr = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0');
                
                let classes = "";
                if (view === 'month' && activeDates.includes(dStr)) classes += 'highlight-orange ';
                if (view === 'month' && isToday) classes += 'highlight-today ';
                
                return classes.trim();
              }}
            />
          </div>
        )}
        <style>{`
          .react-calendar {
            width: 350px;
            max-width: 100%;
            background: white;
            border: none !important;
            font-family: sans-serif;
            line-height: 1.125em;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            padding: 15px;
          }

          .react-calendar__navigation button {
            min-width: 44px;
            background: none;
            border: none;
            font-size: 16px;
            font-weight: bold;
            color: #333 !important;
            cursor: pointer;
          }

          .react-calendar__month-view__weekdays {
            text-align: center;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 0.75em;
            color: #666 !important;
            padding-bottom: 10px;
          }

          .react-calendar__month-view__days {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr);
          }

          .react-calendar__tile {
            max-width: 100%;
            padding: 12px 6.6667px;
            background: none;
            border: none;
            text-align: center;
            line-height: 16px;
            font-size: 14px;
            color: #333 !important;
            cursor: pointer;
          }

          .highlight-today {
            background: #fff9c4 !important;
            color: #333 !important;
            border: 2px solid #fbc02d !important;
            border-radius: 8px !important;
          }

          .highlight-orange { 
            background: #FF8C04 !important; 
            color: white !important; 
            border-radius: 8px !important;
            font-weight: bold;
          }
          
          .highlight-orange.highlight-today {
            border: 2px solid #333 !important;
          }

          .react-calendar__tile--active {
            background: #667eea !important;
            color: white !important;
            border-radius: 8px;
          }

          .calendar-wrapper {
            display: flex;
            justify-content: center;
            width: 100%;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-container" id="report-container">
      <div className="report-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <button 
          onClick={() => setSelectedDate(null)} 
          style={{ background: '#666', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← Nazad
        </button>
        <h2 style={{margin: 0, color: '#333'}}>Izvještaj za {new Date(selectedDate).toLocaleDateString("hr-HR")}</h2>
        <button onClick={handlePrint} className="btn-primary" style={{background: '#667eea', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer'}}>
          Ispiši ✓
        </button>
      </div>

      <div style={{ background: '#ddd', padding: '10px 15px', marginBottom: '10px', fontWeight: '600', color: '#333', display: 'flex', justifyContent: 'space-between' }}>
        <div>{startTime && endTime ? <>{fmtDate(startTime)} - {fmtDate(endTime)}</> : 'Nema prometa'}</div>
        <div>{positiveReceipts.length} računa</div>
      </div>

      <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '10px', background: 'white'}}>
        <tbody>
          <tr style={{borderBottom: '1px solid #ddd'}}>
            <td style={{padding: '8px 15px', color: '#666'}}>Izdanih računa</td>
            <td style={{padding: '8px 15px', textAlign: 'right', color: '#333', fontWeight: '600'}}>{positiveReceipts.length}</td>
          </tr>
          <tr style={{borderBottom: '1px solid #ddd'}}>
            <td style={{padding: '8px 15px', color: '#666'}}>Raspon brojeva</td>
            <td style={{padding: '8px 15px', textAlign: 'right', color: '#333'}}>{positiveReceipts.length > 0 ? `${minReceiptNum} do ${maxReceiptNum}` : 'N/A'}</td>
          </tr>
        </tbody>
      </table>

      <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '10px', background: 'white'}}>
        <thead>
          <tr style={{background: '#ddd'}}>
            <th style={{padding: '8px 15px', textAlign: 'left'}}>Artikli</th>
            <th style={{padding: '8px 15px', textAlign: 'center'}}>Količina</th>
            <th style={{padding: '8px 15px', textAlign: 'right'}}>Suma</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(allArticles).map(([name, data]) => (
            <tr key={name} style={{borderBottom: '1px solid #ddd'}}>
              <td style={{padding: '8px 15px'}}>{name}</td>
              <td style={{padding: '8px 15px', textAlign: 'center'}}>{data.quantity}</td>
              <td style={{padding: '8px 15px', textAlign: 'right'}}>{data.total.toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* REKAPITULACIJA PO PLAĆANJU - Koristi isti stil kao tablica iznad */}
      <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '10px', background: 'white'}}>
        <thead>
          <tr style={{background: '#ddd'}}>
            <th style={{padding: '8px 15px', textAlign: 'left'}}>Način plaćanja</th>
            <th style={{padding: '8px 15px', textAlign: 'center'}}>Br. računa</th>
            <th style={{padding: '8px 15px', textAlign: 'right'}}>Suma</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(paymentTotals).map(([method, total]) => (
            <tr key={method} style={{borderBottom: '1px solid #ddd'}}>
              <td style={{padding: '8px 15px'}}>{method}</td>
              <td style={{padding: '8px 15px', textAlign: 'center'}}>{paymentCounts[method] || 0}</td>
              <td style={{padding: '8px 15px', textAlign: 'right'}}>{total.toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{background: '#ddd', padding: '10px 15px', marginBottom: '10px', textAlign: 'right', fontWeight: '600'}}>
        UKUPNO: {grandTotal.toFixed(2)} €
      </div>

      <div style={{background: '#FF8C04', padding: '10px 15px', marginBottom: '10px', textAlign: 'right', fontWeight: '600', color: 'white'}}>
        {Object.keys(paymentTotals)[0] || "Plaćanje"} + Polog: {(Math.abs(Object.values(paymentTotals)[0] || 0) + 130).toFixed(2)} €
      </div>

      <div style={{background: '#FF8C04', padding: '10px 15px', marginBottom: '20px', textAlign: 'right', fontWeight: '600', color: 'white', fontSize: '16px'}}>
        Ukupno + Polog: {(grandTotal + 130).toFixed(2)} €
      </div>

      <div style={{display: 'none'}}>
        <div ref={receiptRef}>
          <IzvjestajReceipt data={reportData} />
        </div>
      </div>
    </div>
  );
}