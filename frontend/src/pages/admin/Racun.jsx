import { useRef, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const Receipt = ({ order }) => {
   if (!order || !order.items) return null;

   const W = 42;
   const line = "─".repeat(W);

   const center = (text) => {
      const pad = Math.max(0, Math.floor((W - text.length) / 2));
      return " ".repeat(pad) + text;
   };
   const rpad = (s, n) => s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
   const lpad = (s, n) => s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s;
   const padLeft = (s, n) => lpad(String(s), n);

   const total = order.items.reduce((acc, item) => acc + parseFloat(item.price) * parseFloat(item.quantity), 0);

   // RACUNANJE POREZNIH GRUPA
   const taxGroups = order.items.reduce((acc, item) => {
      const rate = Number(item.taxRate || 0);
      const brutto = parseFloat(item.price) * parseFloat(item.quantity);
      const netto = brutto / (1 + rate / 100);
      const tax = brutto - netto;

      if (!acc[rate]) {
         acc[rate] = { base: 0, tax: 0 };
      }
      acc[rate].base += netto;
      acc[rate].tax += tax;
      return acc;
   }, {});

   const COL_NAME = 20;
   const COL_QTY  = 4;
   const COL_PRC  = 7;
   const COL_TOT  = 7;

   const itemLines = order.items.map(item => {
      const name = item.name || "";
      const qty  = item.quantity.toString();
      const prc  = parseFloat(item.price).toFixed(2);
      const tot  = (parseFloat(item.price) * parseFloat(item.quantity)).toFixed(2);

      const nameChunks = [];
      for (let i = 0; i < name.length; i += COL_NAME) {
         nameChunks.push(name.slice(i, i + COL_NAME));
      }
      if (nameChunks.length === 0) nameChunks.push("");

      return nameChunks.map((chunk, i) => {
         if (i < nameChunks.length - 1) {
            return rpad(chunk, COL_NAME) + " " + " ".repeat(COL_QTY) + " " + " ".repeat(COL_PRC) + " " + " ".repeat(COL_TOT);
         }
         return rpad(chunk, COL_NAME) + " " + lpad(qty, COL_QTY) + " " + lpad(prc, COL_PRC) + " " + lpad(tot, COL_TOT);
      }).join("\n");
   }).join("\n");

   const s = {
      wrap:   { fontFamily: "'Courier New', Courier, monospace", fontSize: "13px", width: "72mm", margin: "0 auto", color: "#000", background: "#fff", padding: "4mm 2mm", fontWeight: "bold" },
      center: { textAlign: "center" },
      big:    { fontSize: "18px", fontWeight: "bold" },
      pre:    { fontFamily: "inherit", fontSize: "inherit", margin: "0", whiteSpace: "pre", lineHeight: "1.4", fontWeight: "bold" },
      qr:     { textAlign: "center", marginTop: "6px" },
   };

   return (
      <div style={s.wrap}>
         <div style={{ ...s.center, marginBottom: "4px" }}>
            <div style={s.big}>SS FER</div>
            <div>Unska 3, 10000 Zagreb, Hrvatska</div>
            <div>blagajnik@kset.org</div>
            <div>OIB: 14504100762</div>
         </div>

         <pre style={s.pre}>{line}</pre>

         <pre style={s.pre}>{
`Telefon: ${order.phone || "0916043415"}
E-mail:  ${order.email || "email od blagajnika ili stogod"}
${line}
Račun br:         ${order.num}
Vrijeme:          ${order.time}
Blagajnik:        ${order.cashier}
${line}
${rpad("Naziv", COL_NAME)} ${lpad("Kol.", COL_QTY)} ${lpad("Cij.", COL_PRC)} ${lpad("Iznos", COL_TOT)}
${line}
${itemLines}
${line}
${rpad("UKUPNO", W - COL_TOT - 1)}${lpad(total.toFixed(2) + " \u20ac", COL_TOT + 1)}
${line}
Način plaćanja: ${order.payment}
${line}
Porez  %   Osnovica     Iznos
${line}
${Object.entries(taxGroups).map(([rate, values]) => {
    return `PDV ${padLeft(rate + "%", 9)}  ${padLeft(values.base.toFixed(2), 8)}  ${padLeft(values.tax.toFixed(2), 7)}`;
}).join("\n")}
${line}

JIR: ${order.jir || "N/A"}
ZKI: ${order.zki || "N/A"}

${center("#fiskalizacija")}`}
         </pre>

         {order.qrCode ? (
            <div style={s.qr}>
               <img src={`data:image/png;base64,${order.qrCode}`} width={110} height={110} alt="QR" />
            </div>
         ) : order.link ? (
            <div style={s.qr}>
               <QRCodeSVG value={order.link} size={110} level="Q" bgColor="#FFFFFF" fgColor="#000000" />
            </div>
         ) : null}
      </div>
   );
};

const ReceiptPrintButton = ({ order, onAfterPrint, onFiskaliziraj, autoPrint }) => {
   const receiptRef = useRef();
   const iframeRef = useRef();
   const [printOrder, setPrintOrder] = useState(null);
   const shouldPrintRef = useRef(false);

   const doPrint = () => {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; }
        @media print { @page { margin: 0; size: 80mm auto; } }
      </style></head><body>${receiptRef.current.innerHTML}</body></html>`);
      doc.close();
      setTimeout(() => {
         iframe.contentWindow.focus();
         iframe.contentWindow.print();
         if (onAfterPrint) setTimeout(onAfterPrint, 500);
      }, 300);
   };

   const printaj = (updatedOrder) => {
      shouldPrintRef.current = true;
      setPrintOrder(updatedOrder ?? order);
   };

   useEffect(() => {
      if (autoPrint && order) {
         shouldPrintRef.current = true;
         setTimeout(() => setPrintOrder(order), 0);
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   useEffect(() => {
      if (shouldPrintRef.current && printOrder) {
         shouldPrintRef.current = false;
         setTimeout(doPrint, 50);
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [printOrder]);

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
               <Receipt order={printOrder ?? order} />
            </div>
         </div>
         <iframe ref={iframeRef} style={{ display: "none" }} title="print-frame" />

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
