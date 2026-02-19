import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

const Receipt = ({ order }) => {
  if (!order || !order.items) return null;

  const line = "-".repeat(42);
  
  const padLeft = (text, width) => {
    const s = String(text);
    return s.length >= width ? s.slice(0, width) : " ".repeat(width - s.length) + s;
  };

  const maxNameWidth = 14; 
  const maxLastNameWidth = 7; 

  const wrapText = (text, width, lastWidth) => {
    const lines = [];
    let start = 0;
    const str = String(text);
    while (str.length - start >= width) {
      lines.push(str.slice(start, start + width));
      start += width;
    }
    lines.push(str.slice(start, Math.min(start + lastWidth, str.length)));
    return lines;
  };

  // --- Group Taxes by Rate ---
  const taxGroups = order.items.reduce((groups, item) => {
    const rate = Number(item.taxRate || 0);
    const brutto = Number(item.price) * Number(item.quantity);
    const netto = brutto / (1 + rate / 100);
    const taxValue = brutto - netto;

    if (!groups[rate]) {
      groups[rate] = { base: 0, tax: 0 };
    }
    groups[rate].base += netto;
    groups[rate].tax += taxValue;
    return groups;
  }, {});

  return (
    <div className="receipt-container">
      <pre className="receipt-text">
{`
Telefon: ${order.phone || ""}
E-mail: ${order.email || ""}

Račun br: ${order.num}
Vrijeme: ${order.time}
Blagajnik: ${order.cashier}

Artikl${" ".repeat(2)}Kol.${" ".repeat(4)}Cijena${" ".repeat(4)}Iznos
${line}
${order.items.map(item => {
    const nameLines = wrapText(item.name, maxNameWidth, maxLastNameWidth);
    return nameLines
      .map((lineText, index) => {
        if (index === nameLines.length - 1) {
          return `${lineText.padEnd(maxLastNameWidth)} ${padLeft(item.quantity.toString(), 4)}  ${padLeft(Number(item.price).toFixed(2), 8)}  ${padLeft((Number(item.price) * Number(item.quantity)).toFixed(2), 7)}`;
        } else {
          return lineText;
        }
      })
      .join("\n");
}).join("\n")}
${line}
UKUPNO${padLeft(Number(order.total || 0).toFixed(2) + " €", 25)}
${line}
Način plaćanja: ${order.payment}
${line}
Porez      %  Osnovica    Iznos
${line}
${Object.entries(taxGroups).map(([rate, values]) => {
    return `PDV ${padLeft(rate + "%", 9)}  ${padLeft(values.base.toFixed(2), 8)}  ${padLeft(values.tax.toFixed(2), 7)}`;
}).join("\n")}
${line}

JIR: ${order.jir || "N/A"}
ZKI: ${order.zki || "N/A"}

#fiskalizacija
`}
      </pre>
      <div className="qr-wrapper">
        <QRCodeSVG
          value={order.link || "https://kset.org"}
          size={128}
          level="L"
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>
    </div>
  );
};

const ReceiptPrintButton = ({ order, onAfterPrint, onFiskaliziraj }) => {
  const receiptRef = useRef();

  const printaj = () => {
    const w = window.open("", "_blank");
    
    w.document.write(`
      <html>
        <head>
          <title>Racun_${order.num}</title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 300px; 
              margin: 0; 
              padding: 20px; 
              background-color: white;
            }
            .receipt-text { 
              white-space: pre-wrap; 
              font-size: 13px; 
              line-height: 1.2; 
              margin: 0;
            }
            .qr-wrapper { 
              display: flex; 
              justify-content: center; 
              margin-top: 15px; 
              padding-bottom: 30px;
            }
          </style>
        </head>
        <body>
          ${receiptRef.current.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    w.document.close();

    if (onAfterPrint) {
      setTimeout(onAfterPrint, 800);
    }
  };

  const handleClick = () => {
    if (onFiskaliziraj) {
      onFiskaliziraj(printaj);
    } else {
      printaj();
    }
  };

  return (
    <div>
      <div style={{ display: "none" }}>
        <div ref={receiptRef}>
          <Receipt order={order} />
        </div>
      </div>

      <button
        onClick={handleClick}
        className={onFiskaliziraj ? "btn-success" : "btn-primary"}
        style={{ width: '100%', padding: '10px', marginTop: '10px' }}
      >
        {onFiskaliziraj ? "Fiskaliziraj i Ispiši" : "Ispiši Račun"}
      </button>
    </div>
  );
};

export default ReceiptPrintButton;