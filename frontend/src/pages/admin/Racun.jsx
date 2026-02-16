import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";


const Receipt = ({ order }) => {
   if (!(order.items)) return


   const line = "-".repeat(42);

   
   const padLeft = (text, width) =>
      text.length >= width ? text.slice(0, width) : " ".repeat(width - text.length) + text;

   const maxNameWidth = 14; // width for name per line
   const maxLastNameWidth = 7; 

   // Helper to split text into chunks of maxNameWidth
   const wrapText = (text, width, lastWidth) => {
      const lines = [];
      let start = 0;
      while (text.length - start >= width) {
         lines.push(text.slice(start, start + width));
         start += width;
      }
      lines.push(text.slice(start, Math.min(start + lastWidth, text.length)));
      console.log(lines)
      return lines;
   };

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
                  // Last line: show quantity, price, total
                  return `${lineText.padEnd(maxLastNameWidth)} ${padLeft(item.quantity.toString(), 4)}  ${padLeft(item.price.toFixed(2), 8)}  ${padLeft((item.price * item.quantity).toFixed(2), 7)}`;
               } else {
                  // Other lines: just the name
                  return lineText;
               }
            })
            .join("\n");
      }).join("\n")}
${line}
UKUPNO${padLeft(order.items.reduce(
         (acc, item) => acc + item.price * item.quantity,
         0
      ).toFixed(2) + " €", 25)}
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


const ReceiptPrintButton = ({ order }) => {
   const receiptRef = useRef();

   const printaj = () => {

      const w = window.open("", "_blank");
      w.document.write(
         receiptRef.current.outerHTML);
      w.document.close();
      w.print();
      w.close();
   };

   return (
      <div>
         <div style={{ display: "none" }}>
            <div ref={receiptRef}>
               <Receipt order={order}  />
            </div>
         </div>

         <button
            onClick={printaj}
         >
            Ispiši
         </button>
      </div>
   );
};

export default ReceiptPrintButton;
