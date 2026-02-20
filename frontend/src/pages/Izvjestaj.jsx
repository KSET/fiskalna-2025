import { useState, useEffect, useRef } from "react";
import "../styles/Pages.css";

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

  const fmtDate = (d) => d ? d.toLocaleDateString("hr-HR", { day: '2-digit', month: '2-digit', year: 'numeric' }) + " " + d.toLocaleTimeString("hr-HR", { hour: '2-digit', minute: '2-digit' }) : "N/A";

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

export default function Izvjestaj() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const recRes = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts`, { credentials: "include" });
        const data = await recRes.json();
        if (!recRes.ok || !Array.isArray(data)) {
          console.error("Receipts API error or invalid data:", data);
          setReceipts([]);
        } else {
          setReceipts(data);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setReceipts([]);
        setLoading(false);
      }
    })();
  }, []);

  const dayReceipts = [...receipts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const positiveReceipts = dayReceipts.filter(r => r.status !== 'STORNO');
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

    if (!articlesByPayment[method]) {
      articlesByPayment[method] = {};
    }
    if (receipt.items) {
      const sign = receipt.status === 'STORNO' ? -1 : 1;
      receipt.items.forEach(item => {
        const name = item.article?.name || "N/A";
        const qty = sign * parseFloat(item.quantity);
        const total = qty * Math.abs(parseFloat(item.price));

        if (!articlesByPayment[method][name]) {
          articlesByPayment[method][name] = {
            quantity: 0,
            price: item.price,
            total: 0
          };
        }
        articlesByPayment[method][name].quantity += qty;
        articlesByPayment[method][name].total += total;

        if (!allArticles[name]) {
          allArticles[name] = {
            quantity: 0,
            price: item.price,
            total: 0
          };
        }
        allArticles[name].quantity += qty;
        allArticles[name].total += total;
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

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container" id="report-container">

      <div className="report-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{margin: 0, color: '#333'}}>Izvještaj</h1>
        <button onClick={handlePrint} className="btn-primary no-print" style={{background: '#667eea', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer'}}>
          Ispiši ✓
        </button>
      </div>

      {/* Vremenski raspon i brojevi računa - header section */}
      <div style={{ background: '#ddd', padding: '10px 15px', marginBottom: '10px', fontWeight: '600', color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {startTime && endTime ? (
            <>
              {startTime.toLocaleDateString("hr-HR", { day: '2-digit', month: '2-digit', year: 'numeric' })}, {startTime.toLocaleTimeString("hr-HR", {hour: '2-digit', minute:'2-digit'})} - {endTime.toLocaleDateString("hr-HR", { day: '2-digit', month: '2-digit', year: 'numeric' })}, {endTime.toLocaleTimeString("hr-HR", {hour: '2-digit', minute:'2-digit'})}
            </>
          ) : (
            'Nema računa'
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
              <td style={{padding: '8px 15px', textAlign: 'right', color: '#333'}}><span className="currency">{Math.abs(data.total).toFixed(2)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Grand total row */}
      <div style={{background: '#ddd', padding: '10px 15px', marginBottom: '10px', textAlign: 'right', fontWeight: '600', color: '#333'}}>
        <span className="currency">{Math.abs(grandTotal).toFixed(2)}</span>
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
            const totalSum = Object.values(articles).reduce((sum, item) => sum + item.total, 0);
            return (
              <tr key={method} style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '8px 15px', color: '#333'}}>{method}</td>
                <td style={{padding: '8px 15px', textAlign: 'center', color: '#333'}}>{paymentCounts[method] || 0}</td>
                <td style={{padding: '8px 15px', textAlign: 'right', color: '#333'}}><span className="currency">{Math.abs(totalSum).toFixed(2)}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Grand total row */}
      <div style={{background: '#ddd', padding: '10px 15px', marginBottom: '10px', textAlign: 'right', fontWeight: '600', color: '#333'}}>
        <span className="currency">{Math.abs(grandTotal).toFixed(2)}</span>
      </div>

      {/* Polog summary */}
      <div style={{background: '#FF8C04', padding: '10px 15px', marginBottom: '10px', textAlign: 'right', fontWeight: '600', color: 'white'}}>
        {Object.keys(articlesByPayment)[0]} + Polog: <span className="currency">{(Math.abs(Object.values(paymentTotals)[0] || 0) + 130).toFixed(2)}</span>
      </div>

      {/* Ukupno + Polog */}
      <div style={{background: '#FF8C04', padding: '10px 15px', marginBottom: '20px', textAlign: 'right', fontWeight: '600', color: 'white', fontSize: '16px'}}>
        Ukupno + Polog: <span className="currency">{(Math.abs(grandTotal) + 130).toFixed(2)}</span>
      </div>

      {/* Hidden receipt for printing */}
      <div style={{display: 'none'}}>
        <div ref={receiptRef}>
          <IzvjestajReceipt data={reportData} />
        </div>
      </div>
    </div>
  );
}
