import { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "../../styles/Pages.css";

// Tvoj originalni helper
const fmtDate = (d) => d ? d.toLocaleDateString("hr-HR", { day: '2-digit', month: '2-digit', year: 'numeric' }) + " " + d.toLocaleTimeString("hr-HR", { hour: '2-digit', minute: '2-digit' }) : "N/A";

const IzvjestajReceipt = ({ data, paymentStornoCounts }) => {
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
    const stornoCount = paymentStornoCounts?.[method] || 0;
    const totalSum = Object.values(articles).reduce((sum, item) => sum + item.total, 0);
    const methodLabel = rpad(method, COL_NAME - 5);
    return methodLabel + lpad(String(count), 3) + "/" + lpad(String(stornoCount), 2) + " " + lpad(totalSum.toFixed(2) + " \u20ac", COL_TOT);
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
${rpad("Način plaćanja", COL_NAME - 5)}${lpad("Kol.", 3)}/${lpad("St.", 2)} ${lpad("Iznos", COL_TOT)}
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
  const [dateRange, setDateRange] = useState([null, null]);
  const [firstDateClick, setFirstDateClick] = useState(null); // Track first click for range selection
  const receiptRef = useRef();
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');


  const handleCalendarDayClick = (date) => {
    
    if (!firstDateClick) {
      //console.log("First click - setting single date range");
      setFirstDateClick(date);
      setDateRange([date, date]);
    } else {
      const start = new Date(Math.min(firstDateClick.getTime(), date.getTime()));
      const end = new Date(Math.max(firstDateClick.getTime(), date.getTime()));
      //console.log("Second click - completing range from", start, "to", end);
      setDateRange([start, end]);
      setFirstDateClick(null); // Reset for next selection
    }
  };
  const handleStorno = async (receiptId) => {
    if (!window.confirm("Jeste li sigurni da želite stornirati ovaj račun?")) return;

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/${receiptId}/storno`, {
        method: 'PUT',
        credentials: "include",
      });

      if (res.ok) {
        alert("Račun uspješno storniran.");
        
        // Refresh data based on whether it's a single date or range
        if (selectedDate && selectedDate.includes(' to ')) {
          // It's a date range
          const [startStr, endStr] = selectedDate.split(' to ');
          const startDateObj = new Date(startStr);
          const endDateObj = new Date(endStr);

          const startOffset = startDateObj.getTimezoneOffset();
          const startAdjusted = new Date(startDateObj.getTime() - (startOffset * 60 * 1000));
          const startFormatted = startAdjusted.toISOString().split('T')[0];

          const endOffset = endDateObj.getTimezoneOffset();
          const endAdjusted = new Date(endDateObj.getTime() - (endOffset * 60 * 1000));
          const endFormatted = endAdjusted.toISOString().split('T')[0];

          const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/range?from=${startFormatted}&to=${endFormatted}`, { 
            credentials: "include" 
          });
          const refreshData = await refreshRes.json();
          setReceipts(Array.isArray(refreshData) ? refreshData : []);
        } else if (selectedDate) {
          // It's a single date
          const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/range?from=${selectedDate}&to=${selectedDate}`, { 
            credentials: "include" 
          });
          const refreshData = await refreshRes.json();
          setReceipts(Array.isArray(refreshData) ? refreshData : []);
        }
      } else {
        const errData = await res.json();
        alert(`Greška: ${errData.message || 'Neuspjelo storniranje'}`);
      }
    } catch (error) {
      console.error("Storno error:", error);
      alert("Došlo je do greške na mreži.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/receipts/active-dates`, { credentials: "include" })
      .then(res => res.json())
      .then(data => setActiveDates(data))
      .catch(err => console.error("Error loading active dates:", err));
  }, []);


  useEffect(() => {
    //console.log("RANGE DATUMA:", dateRange);
  }, [dateRange]);

  const handleViewTransactions = async () => {
  //console.log("Button clicked! Current dateRange:", dateRange);
  //console.log("dateRange[0]:", dateRange[0], "dateRange[1]:", dateRange[1]);
  
  if (!dateRange[0]) {
    //console.log("dateRange[0] is falsy - showing alert");
    alert("Molimo odaberite početni datum");
    return;
  }

  //console.log("Proceeding with fetch...");
  const startDateObj = new Date(dateRange[0]);
  const endDateObj = dateRange[1] ? new Date(dateRange[1]) : new Date(dateRange[0]);

  const startOffset = startDateObj.getTimezoneOffset();
  const startAdjusted = new Date(startDateObj.getTime() - (startOffset * 60 * 1000));
  const startStr = startAdjusted.toISOString().split('T')[0];

  const endOffset = endDateObj.getTimezoneOffset();
  const endAdjusted = new Date(endDateObj.getTime() - (endOffset * 60 * 1000));
  const endStr = endAdjusted.toISOString().split('T')[0];

  //console.log("Fetching from", startStr, "to", endStr);

  setLoading(true);
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/range?from=${startStr}&to=${endStr}`, { 
      credentials: "include" 
    });
    const data = await res.json();
    //console.log("Fetched data:", data);
    setReceipts(Array.isArray(data) ? data : []);
    setSelectedDate(`${startStr} to ${endStr}`);
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
  const paymentStornoCounts = {};

  // Broji samo RACUN i STORNO (isključuje RACUN_STORNIRAN)
  dayReceipts.forEach(receipt => {
    if (receipt.status !== 'RACUN_STORNIRAN') {
      const method = receipt.paymentType;
      paymentCounts[method] = (paymentCounts[method] || 0) + 1;
      
      // Broji samo STORNO
      if (receipt.status === 'STORNO') {
        paymentStornoCounts[method] = (paymentStornoCounts[method] || 0) + 1;
      }
    }
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

  const uniquePaymentTypes = [...new Set(dayReceipts.map(r => r.paymentType).filter(Boolean))];
  const filteredReceipts = dayReceipts.filter(r => {
    if (filterPayment && r.paymentType !== filterPayment) return false;
    if (filterStatus === 'STORNO_OTKAZANO' && r.status !== 'STORNO' && r.status !== 'RACUN_STORNIRAN') return false;
    else if (filterStatus && filterStatus !== 'STORNO_OTKAZANO' && r.status !== filterStatus) return false;
    return true;
  });

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
          <div className="calendar-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px', minHeight: '20px' }}>
              {dateRange[0] && dateRange[1] ? (
                <span style={{ fontWeight: 'bold', color: '#333' }}>
                  Odabrani datum: {dateRange[0].toLocaleDateString("hr-HR")} 
                  {dateRange[0].getTime() !== dateRange[1].getTime() ? ` do ${dateRange[1].toLocaleDateString("hr-HR")}` : ""}
                </span>
              ) : firstDateClick ? (
                <span style={{ color: '#ff9800' }}>
                  OVO ne radi i ne detektira kako spada pocetni datum: {firstDateClick.toLocaleDateString("hr-HR")} 
                </span>
              ) : (
                <span style={{ color: '#999' }}>Klinite na datum da počnete...</span>
              )}
            </div>
            <Calendar 
              selectRange={true}
              value={dateRange}
              onChange={() => {}} // Prevent default onChange behavior
              onClickDay={handleCalendarDayClick}
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
            <button 
              onClick={handleViewTransactions}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#5568d3'}
              onMouseLeave={(e) => e.target.style.background = '#667eea'}
            >
              Pogledaj transakcije
            </button>
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

          .react-calendar__navigation {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 15px;
          }

          .react-calendar__navigation button {
            min-width: 44px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            color: #333 !important;
            cursor: pointer;
            padding: 8px 12px;
            transition: all 0.2s ease;
            appearance: button;
            -webkit-appearance: button;
          }

          .react-calendar__navigation button:hover {
            background: #e0e0e0;
            border-color: #999;
          }

          .react-calendar__navigation button:active {
            background: #d0d0d0;
            border-color: #666;
          }

          .react-calendar__navigation button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
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

          .react-calendar__tile--range {
            background: #cfe0ff !important;
            color: #333 !important;
          }

          .react-calendar__tile--rangeStart,
          .react-calendar__tile--rangeEnd {
            background: #667eea !important;
            color: white !important;
            border-radius: 8px;
            font-weight: bold;
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
          onClick={() => {
            setSelectedDate(null);
            setDateRange([null, null]);
            setFirstDateClick(null); // Reset first date click tracking
            setFilterPayment('');
            setFilterStatus('');
          }} 
          style={{ background: '#666', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← Nazad
        </button>
        <h2 style={{margin: 0, color: '#333'}}>
          Izvještaj za {selectedDate && selectedDate.includes(' to ') 
            ? `${new Date(selectedDate.split(' to ')[0]).toLocaleDateString("hr-HR")} - ${new Date(selectedDate.split(' to ')[1]).toLocaleDateString("hr-HR")}`
            : selectedDate ? new Date(selectedDate).toLocaleDateString("hr-HR") : 'N/A'
          }
        </h2>
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
            <th style={{padding: '8px 15px', textAlign: 'center'}}>Cijena</th>
            <th style={{padding: '8px 15px', textAlign: 'right'}}>Suma</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(allArticles).map(([name, data]) => (
            <tr key={name} style={{borderBottom: '1px solid #ddd'}}>
              <td style={{padding: '8px 15px'}}>{name}</td>
              <td style={{padding: '8px 15px', textAlign: 'center'}}>{data.quantity}</td>
              <td style={{padding: '8px 15px', textAlign: 'center'}}>{parseFloat(data.price).toFixed(2)} €</td>
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
            <th style={{padding: '8px 15px', textAlign: 'center'}}>Kol. storno</th>
            <th style={{padding: '8px 15px', textAlign: 'right'}}>Suma</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(paymentTotals).map(([method, total]) => (
            <tr key={method} style={{borderBottom: '1px solid #ddd'}}>
              <td style={{padding: '8px 15px'}}>{method}</td>
              <td style={{padding: '8px 15px', textAlign: 'center'}}>{paymentCounts[method] || 0}</td>
              <td style={{padding: '8px 15px', textAlign: 'center', color: '#d32f2f', fontWeight: 'bold'}}>{paymentStornoCounts[method] || 0}</td>
              <td style={{padding: '8px 15px', textAlign: 'right'}}>{total.toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{background: '#ddd', padding: '10px 15px', marginBottom: '10px', textAlign: 'right', fontWeight: '600'}}>
        UKUPNO: {grandTotal.toFixed(2)} €
      </div>

<h3 style={{ marginTop: '30px', marginBottom: '10px', color: '#333', paddingLeft: '5px' }}>Popis svih računa</h3>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}>
          <option value="">Sva plaćanja</option>
          {uniquePaymentTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}>
          <option value="">Svi statusi</option>
          <option value="RACUN">AKTIVAN</option>
          <option value="STORNO">STORNO</option>
          <option value="RACUN_STORNIRAN">OTKAZANO</option>
          <option value="STORNO_OTKAZANO">STORNO + OTKAZANO</option>
        </select>
        {(filterPayment || filterStatus) && (
          <button onClick={() => { setFilterPayment(''); setFilterStatus(''); }}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', fontSize: '13px' }}>
            Resetiraj filtere
          </button>
        )}
        <span style={{ color: '#666', fontSize: '13px' }}>{filteredReceipts.length} / {dayReceipts.length} računa</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', marginBottom: '40px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <thead>
          <tr style={{ background: '#eee', borderBottom: '2px solid #ccc' }}>
            <th style={{ padding: '10px 15px', textAlign: 'left' }}>Br. računa</th>
            <th style={{ padding: '10px 15px', textAlign: 'center' }}>Vrijeme</th>
            <th style={{ padding: '10px 15px', textAlign: 'left' }}>Plaćanje</th>
            <th style={{ padding: '10px 15px', textAlign: 'right' }}>Iznos</th>
            <th style={{ padding: '10px 15px', textAlign: 'center' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredReceipts.map((r) => {
            const isStorno = r.status === 'STORNO';
            const isCancelled = r.status === 'RACUN_STORNIRAN';

            return (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee', color: (isStorno || isCancelled) ? '#999' : '#333' }}>
                <td style={{ padding: '10px 15px', fontWeight: '500' }}>{r.invoiceNumber}</td>
                <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                  {new Date(r.createdAt).toLocaleTimeString("hr-HR", { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '10px 15px' }}>{r.paymentType}</td>
                <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: 'bold' }}>
                  {parseFloat(r.brutto).toFixed(2)} €
                </td>
                <td style={{ padding: '10px 15px', textAlign: 'center', fontSize: '0.85rem' }}>
                  {isCancelled ? (
                    <span style={{color: '#ef6c00', fontWeight: 'bold'}}>OTKAZANO</span>
                  ) : isStorno ? (
                    <span style={{color: '#d32f2f', fontWeight: 'bold'}}>STORNO</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span style={{color: '#388e3c'}}>AKTIVAN</span>
                      <button 
                        onClick={() => handleStorno(r.id)}
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #f87171',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      >
                        Storniraj
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* print dio */}
      <div style={{display: 'none'}}>
        <div ref={receiptRef}>
          <IzvjestajReceipt data={reportData} paymentStornoCounts={paymentStornoCounts} />
        </div>
      </div>
      <div style={{display: 'none'}}>
        <div ref={receiptRef}>
          <IzvjestajReceipt data={reportData} paymentStornoCounts={paymentStornoCounts} />
        </div>
      </div>
    </div>
  );
}