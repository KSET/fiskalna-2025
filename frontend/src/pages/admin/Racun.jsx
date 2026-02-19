import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

const Receipt = ({ order }) => {
   if (!(order.items)) return;

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

   // --- NEW LOGIC: Group Taxes by Rate ---
   const taxGroups = order.items.reduce((groups, item) => {
      const rate = item.taxRate || 0;
      const brutto = item.price * item.quantity;
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
      <>
      <pre className="receipt">
         {`
Telefon: ${order.phone}
E-mail: ${order.email}

Račun br: ${order.num}
Vrijeme računa: ${order.time}
Oznaka blagajnika: ${order.cashier}

Artikl${" ".repeat(2)}Kol.${" ".repeat(4)}Cijena${" ".repeat(4)}Iznos
${line}
${order.items.map(item => {
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
      }).join("\n")}
${line}
UKUPNO${padLeft(Number(order.total).toFixed(2) + " €", 25)}
${line}
Način plaćanja: ${order.payment}
${line}
Porez      %  Osnovica    Iznos
${line}
${Object.entries(taxGroups).map(([rate, values]) => {
   return `PDV ${padLeft(rate, 10)}  ${padLeft(values.base.toFixed(2), 8)}  ${padLeft(values.tax.toFixed(2), 7)}`;
}).join("\n")}
${line}

JIR: ${order.jir}
ZKI: ${order.zki}

#fiskalizacija
`}
      </pre>
   <div>
   <QRCodeSVG
      value={order.link}
      size={120}
      level="Q"
      bgColor="#FFFFFF"
      fgColor="#000000"
    />
   </div>
</>
   );
};

const ReceiptPrintButton = ({ order, onAfterPrint, onFiskaliziraj }) => {
   const receiptRef = useRef();

   const printaj = () => {

      const w = window.open("", "_blank");
      w.document.write(
         receiptRef.current.outerHTML);
      w.document.close();
      w.print();
      w.close();

      if (onAfterPrint) {
        setTimeout(onAfterPrint, 500); //MORA BITI DELAY INACE NE RADI
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
               <Receipt order={order}  />
            </div>
         </div>

         <button
            onClick={handleClick}
            className={onFiskaliziraj ? "btn-success" : ""}
         >
            {onFiskaliziraj ? "Fiskaliziraj" : "Ispiši"}
         </button>
      </div>
   );
};

export default ReceiptPrintButton;
