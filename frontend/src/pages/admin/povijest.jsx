import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function Povijest() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [reportType, setReportType] = useState("transactions");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getSessionDate = (dateObj) => {
    const d = new Date(dateObj);
    if (d.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const todaySession = getSessionDate(new Date());
  const [startDate, setStartDate] = useState(todaySession);
  const [endDate, setEndDate] = useState(todaySession);
  const [tempStartDate, setTempStartDate] = useState(new Date(startDate));
  const [tempEndDate, setTempEndDate] = useState(new Date(endDate));
  const datePickerRef = useRef(null);

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
    const today = new Date(todaySession);
    setStartDate(todaySession);
    setEndDate(todaySession);
    setTempStartDate(today);
    setTempEndDate(today);
  };

  const handleDateSelection = (date) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(date);
      setTempEndDate(null);
    } else if (!tempEndDate) {
      if (date < tempStartDate) {
        setTempStartDate(date);
        setTempEndDate(tempStartDate);
      } else {
        setTempEndDate(date);
      }
    }
  };

  const handleDatePickerDone = () => {
    if (tempStartDate) {
      const startStr = tempStartDate.toISOString().split('T')[0];
      const endStr = tempEndDate ? tempEndDate.toISOString().split('T')[0] : startStr;
      setStartDate(startStr);
      setEndDate(endStr);
    }
    setShowDatePicker(false);
  };

  const getArticlesReport = () => {
    const articleMap = {};

    filteredTransactions.forEach(t => {
      if (t.receipt?.items && t.receipt.status !== 'STORNO' && t.receipt.status !== 'RACUN_STORNIRAN') {
        const isCash = t.receipt.paymentType === 'GOTOVINA';
        t.receipt.items.forEach(item => {
          const name = item.article?.name || "N/A";
          if (!articleMap[name]) {
            articleMap[name] = {
              name,
              price: item.price,
              quantity: 0,
              cashTotal: 0,
              cardTotal: 0,
              total: 0
            };
          }
          const qty = parseFloat(item.quantity);
          const itemTotal = qty * Math.abs(parseFloat(item.price));
          articleMap[name].quantity += qty;
          articleMap[name].total += itemTotal;
          if (isCash) {
            articleMap[name].cashTotal += itemTotal;
          } else {
            articleMap[name].cardTotal += itemTotal;
          }
        });
      }
    });

    return Object.values(articleMap).sort((a, b) => b.total - a.total);
  };

  const getPaymentReport = () => {
    const paymentMap = {};

    filteredTransactions.forEach(t => {
      if (t.receipt?.paymentType && t.receipt.status !== 'STORNO' && t.receipt.status !== 'RACUN_STORNIRAN') {
        const method = t.receipt.paymentType;
        if (!paymentMap[method]) {
          paymentMap[method] = { method, total: 0, count: 0 };
        }
        paymentMap[method].total += parseFloat(t.amount);
        paymentMap[method].count += 1;
      }
    });

    return Object.values(paymentMap).sort((a, b) => b.total - a.total);
  };

  const getProdajnaMjestaReport = () => {
    const map = {};
    filteredTransactions.forEach(t => {
      if (t.receipt?.status !== 'STORNO' && t.receipt?.status !== 'RACUN_STORNIRAN') {
        const name = t.receipt?.prodajnoMjestoNaziv || "Nepoznato";
        if (!map[name]) map[name] = { name, total: 0, count: 0, gotovina: 0, kartica: 0 };
        const amt = parseFloat(t.amount);
        map[name].total += amt;
        map[name].count += 1;
        const pt = t.receipt?.paymentType;
        if (pt === 'GOTOVINA') map[name].gotovina += amt;
        else if (pt === 'KARTICA') map[name].kartica += amt;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  };

  const exportTransactionsToExcel = () => {
    const excelData = filteredTransactions.map(t => ({
      "Broj Računa": t.receipt?.invoiceNumber || "N/A",
      "Iznos (€)": parseFloat(t.amount).toFixed(2),
      "Plaćanje": t.receipt?.paymentType || "N/A",
      "Status": t.receipt?.status === 'STORNO' ? 'Storno' : t.receipt?.status === 'RACUN_STORNIRAN' ? 'Otkazano' : 'Aktivan',
      "Prodavač": t.user?.name || "Nepoznato",
      "Datum": new Date(t.createdAt).toLocaleDateString("hr-HR"),
      "Vrijeme": new Date(t.createdAt).toLocaleTimeString("hr-HR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      "Fiskalni Dan": getSessionDate(t.createdAt)
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Izvještaj");
    XLSX.writeFile(workbook, `KSET_Izvjestaj_Transakcije_${startDate}_${endDate}.xlsx`);
  };

  const exportArticlesToExcel = () => {
    const articlesReport = getArticlesReport();
    const excelData = articlesReport.map(a => ({
      "Naziv Artikla": a.name,
      "Cijena (€)": parseFloat(a.price).toFixed(2),
      "Količina": a.quantity,
      "Gotovina (€)": a.cashTotal.toFixed(2),
      "Kartica (€)": a.cardTotal.toFixed(2),
      "Suma (€)": a.total.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prodaja po Artiklima");
    XLSX.writeFile(workbook, `KSET_Izvjestaj_Artikli_${startDate}_${endDate}.xlsx`);
  };

  const exportPaymentToExcel = () => {
    const paymentReport = getPaymentReport();
    const excelData = paymentReport.map(p => ({
      "Način Plaćanja": p.method,
      "Količina": p.count,
      "Suma (€)": p.total.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prodaja po Plaćanju");
    XLSX.writeFile(workbook, `KSET_Izvjestaj_Placanje_${startDate}_${endDate}.xlsx`);
  };

  const exportProdajnaMjestaToExcel = () => {
    const report = getProdajnaMjestaReport();
    const excelData = report.map(p => ({
      "Prodajno Mjesto": p.name,
      "Količina": p.count,
      "Gotovina (€)": p.gotovina.toFixed(2),
      "Kartica (€)": p.kartica.toFixed(2),
      "Suma (€)": p.total.toFixed(2)
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prodaja po Prodajnim Mjestima");
    XLSX.writeFile(workbook, `KSET_Izvjestaj_ProdajnaMjesta_${startDate}_${endDate}.xlsx`);
  };

  const handleExport = () => {
    switch(reportType) {
      case 'transactions':
        exportTransactionsToExcel();
        break;
      case 'articles':
        exportArticlesToExcel();
        break;
      case 'payment':
        exportPaymentToExcel();
        break;
      case 'prodajnaMjesta':
        exportProdajnaMjestaToExcel();
        break;
      default:
        break;
    }
  };

  const uniquePaymentTypes = [...new Set(transactions.map(t => t.receipt?.paymentType).filter(Boolean))];

  const filteredTransactions = transactions.filter(t => {
    const transactionSessionDay = getSessionDate(t.createdAt);
    const matchesSearch = !filter ||
      t.receipt?.invoiceNumber?.toLowerCase().includes(filter.toLowerCase()) ||
      t.user?.name?.toLowerCase().includes(filter.toLowerCase());
    if (!matchesSearch) return false;
    if (transactionSessionDay < startDate || transactionSessionDay > endDate) return false;
    if (filterPayment && t.receipt?.paymentType !== filterPayment) return false;
    if (filterStatus === 'STORNO_OTKAZANO' && t.receipt?.status !== 'STORNO' && t.receipt?.status !== 'RACUN_STORNIRAN') return false;
    else if (filterStatus && filterStatus !== 'STORNO_OTKAZANO' && t.receipt?.status !== filterStatus) return false;
    return true;
  });

  const articlesReport = getArticlesReport();
  const paymentReport = getPaymentReport();
  const totalAmount = filteredTransactions
    .filter(t => t.receipt?.status !== 'STORNO' && t.receipt?.status !== 'RACUN_STORNIRAN')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  if (loading) return <div style={{ padding: '40px' }}>Učitavanje...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#fdfdfd', minHeight: '100vh', color: '#333' }}>
      
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1a202c' }}>Izvještaji</h1>
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
        flexWrap: 'wrap',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#4a5568' }}>Vrsta izvještaja:</span>
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="transactions">Povijest transakcija</option>
            <option value="articles">Prodaja po artiklima</option>
            <option value="payment">Prodaja po načinu plaćanja</option>
            <option value="prodajnaMjesta">Prodaja po prodajnim mjestima</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#4a5568' }}>Razdoblje:</span>
          <button 
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{
              padding: '8px 15px',
              borderRadius: '6px',
              border: '2px solid #667eea',
              backgroundColor: '#fff',
              color: '#667eea',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📅 {startDate} {startDate !== endDate ? `— ${endDate}` : ''}
          </button>
        </div>

        {showDatePicker && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            marginTop: '10px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            padding: '20px',
            zIndex: 1000,
            minWidth: '320px'
          }} ref={datePickerRef}>
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#1a202c', fontSize: '16px' }}>Odaberi razdoblje</h3>
              <button 
                onClick={() => setShowDatePicker(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#cbd5e0' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#718096', display: 'block', marginBottom: '8px' }}>
                {!tempStartDate || (tempStartDate && tempEndDate) ? 'KLIKNI POČETNI DATUM' : 'KLIKNI ZAVRŠNI DATUM'}
              </label>
              <Calendar
                value={tempStartDate}
                onChange={handleDateSelection}
                tileClassName={({ date }) => {
                  if (tempStartDate && tempEndDate) {
                    if (date.toDateString() === tempStartDate.toDateString()) return 'date-range-start';
                    if (date.toDateString() === tempEndDate.toDateString()) return 'date-range-end';
                    if (date > tempStartDate && date < tempEndDate) return 'date-range-middle';
                  } else if (tempStartDate && date.toDateString() === tempStartDate.toDateString()) {
                    return 'date-range-start';
                  }
                  return '';
                }}
              />
            </div>
            <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '15px' }}>
              {tempStartDate && <span>Od: <strong>{tempStartDate.toISOString().split('T')[0]}</strong></span>}
              {tempStartDate && tempEndDate && <span> → Do: <strong>{tempEndDate.toISOString().split('T')[0]}</strong></span>}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setTempStartDate(new Date(startDate));
                  setTempEndDate(new Date(endDate));
                  setShowDatePicker(false);
                }}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '6px', 
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  color: '#4a5568',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Otkaži
              </button>
              <button 
                onClick={handleDatePickerDone}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '6px', 
                  border: 'none',
                  backgroundColor: '#667eea',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Spremi
              </button>
            </div>

            <style>{`
              .react-calendar {
                width: 100%;
                border: none !important;
                background: none;
                font-family: inherit;
              }
              .react-calendar__navigation {
                margin-bottom: 15px;
              }
              .react-calendar__navigation button {
                min-width: 40px;
                background: #edf2f7;
                border: 1px solid #cbd5e0;
                border-radius: 6px;
                color: #4a5568 !important;
                cursor: pointer;
                padding: 6px 10px;
                font-weight: 600;
                font-size: 13px;
              }
              .react-calendar__navigation button:hover {
                background: #e2e8f0;
              }
              .react-calendar__month-view__weekdays {
                text-align: center;
                font-weight: bold;
                font-size: 12px;
                color: #718096 !important;
                margin-bottom: 10px;
              }
              .react-calendar__month-view__days {
                display: grid !important;
                grid-template-columns: repeat(7, 1fr);
              }
              .react-calendar__tile {
                padding: 10px 6px;
                background: none;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                color: #2d3748;
              }
              .react-calendar__tile:hover {
                background: #edf2f7;
              }
              .react-calendar__tile--active {
                background: #667eea !important;
                color: white !important;
                font-weight: bold;
              }
              .date-range-start {
                background: #667eea !important;
                color: white !important;
                font-weight: bold;
              }
              .date-range-end {
                background: #667eea !important;
                color: white !important;
                font-weight: bold;
              }
              .date-range-middle {
                background: #cfe0ff !important;
                color: #2d3748 !important;
              }
            `}</style>
          </div>
        )}

        <button onClick={resetToToday} style={secondaryButtonStyle}>Danas</button>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button onClick={handleExport} style={excelButtonStyle}>Export .XLSX</button>
        </div>
      </div>

      {reportType === 'transactions' && (
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
              outline: 'none',
              marginBottom: '10px'
            }}
          />
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
              <option value="">Sva plaćanja</option>
              {uniquePaymentTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
              <option value="">Svi statusi</option>
              <option value="RACUN">AKTIVAN</option>
              <option value="STORNO">STORNO</option>
              <option value="RACUN_STORNIRAN">OTKAZANO</option>
              <option value="STORNO_OTKAZANO">STORNO + OTKAZANO</option>
            </select>
            {(filterPayment || filterStatus) && (
              <button onClick={() => { setFilterPayment(''); setFilterStatus(''); }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f7fafc', cursor: 'pointer', fontSize: '13px' }}>
                Resetiraj filtere
              </button>
            )}
            <span style={{ color: '#718096', fontSize: '13px' }}>{filteredTransactions.length} / {transactions.filter(t => { const d = getSessionDate(t.createdAt); return d >= startDate && d <= endDate; }).length} transakcija</span>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {reportType === 'transactions' && (
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
        )}

        {reportType === 'articles' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#edf2f7', textAlign: 'left' }}>
                <th style={thStyle}>Naziv Artikla</th>
                <th style={thStyle}>Cijena</th>
                <th style={thStyle}>Količina</th>
                <th style={thStyle}>Gotovina</th>
                <th style={thStyle}>Kartica</th>
                <th style={thStyle}>Suma</th>
              </tr>
            </thead>
            <tbody>
              {articlesReport.map((article, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={tdStyle}>{article.name}</td>
                  <td style={tdStyle}>{parseFloat(article.price).toFixed(2)} €</td>
                  <td style={tdStyle}>{article.quantity}</td>
                  <td style={tdStyle}>{article.cashTotal.toFixed(2)} €</td>
                  <td style={tdStyle}>{article.cardTotal.toFixed(2)} €</td>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>{article.total.toFixed(2)} €</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#edf2f7', fontWeight: 'bold' }}>
                <td colSpan="5" style={{ ...tdStyle, textAlign: 'right' }}>UKUPNO:</td>
                <td style={{ ...tdStyle, fontWeight: 'bold' }}>{articlesReport.reduce((sum, a) => sum + a.total, 0).toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
        )}

        {reportType === 'payment' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#edf2f7', textAlign: 'left' }}>
                <th style={thStyle}>Način Plaćanja</th>
                <th style={thStyle}>Količina</th>
                <th style={thStyle}>Suma</th>
              </tr>
            </thead>
            <tbody>
              {paymentReport.map((payment, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={tdStyle}>{payment.method}</td>
                  <td style={tdStyle}>{payment.count}</td>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>{payment.total.toFixed(2)} €</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#edf2f7', fontWeight: 'bold' }}>
                <td colSpan="1" style={{ ...tdStyle, textAlign: 'right' }}>UKUPNO:</td>
                <td style={tdStyle}>{paymentReport.reduce((sum, p) => sum + p.count, 0)}</td>
                <td style={{ ...tdStyle, fontWeight: 'bold' }}>{totalAmount.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
        )}

        {reportType === 'prodajnaMjesta' && (() => {
          const report = getProdajnaMjestaReport();
          return (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#edf2f7', textAlign: 'left' }}>
                  <th style={thStyle}>Prodajno Mjesto</th>
                  <th style={thStyle}>Količina</th>
                  <th style={thStyle}>Gotovina</th>
                  <th style={thStyle}>Kartica</th>
                  <th style={thStyle}>Suma</th>
                </tr>
              </thead>
              <tbody>
                {report.map((pm, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={tdStyle}>{pm.name}</td>
                    <td style={tdStyle}>{pm.count}</td>
                    <td style={tdStyle}>{pm.gotovina.toFixed(2)} €</td>
                    <td style={tdStyle}>{pm.kartica.toFixed(2)} €</td>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>{pm.total.toFixed(2)} €</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#edf2f7', fontWeight: 'bold' }}>
                  <td colSpan="1" style={{ ...tdStyle, textAlign: 'right' }}>UKUPNO:</td>
                  <td style={tdStyle}>{report.reduce((sum, p) => sum + p.count, 0)}</td>
                  <td style={tdStyle}>{report.reduce((sum, p) => sum + p.gotovina, 0).toFixed(2)} €</td>
                  <td style={tdStyle}>{report.reduce((sum, p) => sum + p.kartica, 0).toFixed(2)} €</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{report.reduce((sum, p) => sum + p.total, 0).toFixed(2)} €</td>
                </tr>
              </tbody>
            </table>
          );
        })()}
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
  return <span style={{ ...styles, backgroundColor: '#c6f6d5', color: '#22543d' }}>Aktivan</span>;
}

const thStyle = { padding: '15px', fontSize: '14px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '15px', fontSize: '15px' };
const secondaryButtonStyle = { backgroundColor: '#edf2f7', border: '1px solid #cbd5e0', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#4a5568' };
const excelButtonStyle = { backgroundColor: '#2f855a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };