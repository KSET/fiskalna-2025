import { useState, useEffect, useRef } from "react";
import "../styles/Pages.css";
import ReceiptPrintButton from "./admin/Racun";

export default function Racuni() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [printData, setPrintData] = useState(null);
  const [printingReceiptId, setPrintingReceiptId] = useState(null);
  const printButtonRef = useRef(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/receipts", {
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
      receipt.receiptNumber.toLowerCase().includes(searchLower) ||
      receipt.paymentType.toLowerCase().includes(searchLower) ||
      receipt.user?.name?.toLowerCase().includes(searchLower) ||
      receipt.brutto.toString().includes(searchLower)
    );
  });

  const handleStorno = async (receiptId) => {
    if (window.confirm("Sigurno želite otkazati ovaj račun?")) {
      try {
        await fetch(`http://localhost:3000/api/receipts/${receiptId}/storno`, {
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
      setPrintingReceiptId(receiptId);
      const response = await fetch(`http://localhost:3000/api/receipts/${receiptId}/print`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch print data");
      }
      
      const data = await response.json();
      setPrintData(data);
    } catch (error) {
      console.error("Error fetching print data:", error);
      alert("Greška pri dohvaćanju podataka za ispis");
    }
  };

  // Auto-trigger print when print data is ready
  useEffect(() => {
    if (printData && printingReceiptId) {
      // Create a hidden container and render Receipt for printing
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);
      
      // Trigger print
      const w = window.open("", "_blank");
      const receiptHTML = createReceiptHTML(printData);
      w.document.write(receiptHTML);
      w.document.close();
      w.print();
      w.close();
      
      // Clean up
      document.body.removeChild(container);
      setPrintData(null);
      setPrintingReceiptId(null);
    }
  }, [printData, printingReceiptId]);

  const createReceiptHTML = (order) => {
    const line = "-".repeat(42);
    
    const padLeft = (text, width) =>
      text.length >= width ? text.slice(0, width) : " ".repeat(width - text.length) + text;

    const maxNameWidth = 14;
    const maxLastNameWidth = 7;

    const wrapText = (text, width, lastWidth) => {
      const lines = [];
      let start = 0;
      while (text.length - start >= width) {
        lines.push(text.slice(start, start + width));
        start += width;
      }
      lines.push(text.slice(start, Math.min(start + lastWidth, text.length)));
      return lines;
    };

    const itemsHTML = order.items.map(item => {
      const nameLines = wrapText(item.name, maxNameWidth, maxLastNameWidth);
      return nameLines
        .map((lineText, index) => {
          if (index === nameLines.length - 1) {
            return `${lineText.padEnd(maxLastNameWidth)} ${padLeft(item.quantity.toString(), 4)}  ${padLeft(item.price.toFixed(2), 8)}  ${padLeft((item.price * item.quantity).toFixed(2), 7)}`;
          } else {
            return lineText;
          }
        })
        .join("\n");
    }).join("\n");

    const totalAmount = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2);

    return `
      <html>
        <head>
          <style>
            body { font-family: monospace; margin: 0; padding: 20px; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <pre>
Telefon: ${order.phone}
E-mail: ${order.email}

Račun br: ${order.num}
Vrijeme računa: ${order.time}
Oznaka blagajnika: ${order.cashier}

Artikl  Kol.    Cijena      Iznos
${line}
${itemsHTML}
${line}
UKUPNO${padLeft(totalAmount + " €", 25)}
${line}
Način plaćanja: ${order.payment}
${line}
Porez      %  Osnovica    Iznos
${line}
PDV        5  ${padLeft(order.base.toFixed(2), 8)}  ${padLeft(order.tax.toFixed(2), 7)}
${line}

JIR: ${order.jir}
ZKI: ${order.zki}

#fiskalizacija
          </pre>
        </body>
      </html>
    `;
  };

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <>
      <style>{`
        @media print {
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; }
          #root { width: 100%; margin: 0; padding: 0; }
          .sidebar { display: none !important; }
          .main-layout { display: block !important; margin: 0; padding: 0; }
          .main-content { margin: 0 !important; padding: 20px !important; width: 100% !important; background: white !important; }
          .page-container { max-width: 100%; margin: 0; padding: 0; background: white; }
          input[type="text"] { display: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
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
              <th>Datum</th>
              <th>Način plaćanja</th>
              <th>Ukupno</th>
              <th>Kreirano od</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.map(receipt => (
              <tr key={receipt.id} className={receipt.isCancelled ? "cancelled" : ""}>
                <td>{receipt.receiptNumber}</td>
                <td>{new Date(receipt.createdAt).toLocaleDateString("hr-HR")}</td>
                <td>{receipt.paymentType}</td>
                <td>€{receipt.brutto.toFixed(2)}</td>
                <td>{receipt.user?.name || "N/A"}</td>
                <td>
                  {receipt.isCancelled ? (
                    <span className="badge-danger">Otkazan</span>
                  ) : (
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
                  {!receipt.isCancelled && (
                    <button
                      onClick={() => handleStorno(receipt.id)}
                      className="btn-small btn-danger"
                    >
                      Storno
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Print Modal */}
    {printData && printingReceiptId && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }}>
          <button
            onClick={() => {
              setPrintData(null);
              setPrintingReceiptId(null);
            }}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
          <div ref={printButtonRef}>
            <ReceiptPrintButton 
              order={printData} 
              onAfterPrint={() => {
                setPrintData(null);
                setPrintingReceiptId(null);
              }}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
