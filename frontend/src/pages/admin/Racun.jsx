import { useRef } from "react";

const CroatianDateTime = () => {
   const date = new Date();
   const pad = (num) => num.toString().padStart(2, "0");

   const formattedDate =
      `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}. ${pad(date.getHours())}:${pad(date.getMinutes())}`;

   return formattedDate
};


const orderInfo = {
   phone: "0916043415",
   email: "info@kset.org",
   time: CroatianDateTime(),
   date: Date.now(),
   cashier: "doria",
   items: [
   ],
   total: 0, // todo 
   base:0,
   tax:0,
   
   jir: 4332,
   zki: 3924

};


const Receipt = ({ order, items }) => {
   const line = "-".repeat(42);

   const padRight = (text, width) =>
      text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);

   const padLeft = (text, width) =>
      text.length >= width ? text.slice(0, width) : " ".repeat(width - text.length) + text;

   const maxLineWidth = 10; // width for name per line

  // Helper to split text into chunks of maxLineWidth
  const wrapText = (text, width) => {
    const lines = [];
    let start = 0;
    while (start < text.length) {
      lines.push(text.slice(start, start + width));
      start += width;
    }
    return lines;
  };

   return (
      <pre className="receipt">

         {`
 Telefon: ${order.phone}
 E-mail: ${order.email}

 Račun br: ${order.num}
 Vrijeme računa: ${order.time}
 Oznaka blagajnika: ${order.cashier}

 Artikl  Kol.  Cijena   Iznos
 ${line}
 ${items.map(item => {
   const nameLines = wrapText(item.name, maxLineWidth);
   return nameLines
     .map((lineText, index) => {
       if (index === nameLines.length - 1) {
         // Last line: show quantity, price, total
         return `${lineText.padEnd(maxLineWidth)} ${padLeft(item.quantity.toString(), 4)}  ${padLeft(item.price.toFixed(2), 7)}  ${padLeft((item.price * item.quantity).toFixed(2), 7)}`;
       } else {
         // Other lines: just the name
         return lineText;
       }
     })
     .join("\n");
 }).join("\n")}
 ${line}
 UKUPNO${padLeft (items.reduce(
   (acc, item) => acc + item.price * item.quantity,
   0
 ).toFixed(2) + " €", 32)}
 ${line}
 Način plaćanja: ${order.payment}
 ${line}
 Porez     %  Osnovica   Iznos
 ${line}
 PDV       5  ${padLeft(order.base.toFixed(2), 8)}  ${padLeft(order.tax.toFixed(2), 7)}
 ${line}
 
 JIR: ${order.jir}
 ZKI: ${order.zki}
 
 #fiskalizacija
 `}
      </pre>
   );
};


const ReceiptPrintButton = ({ currentOrder }) => {
   console.log(currentOrder)
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
               <Receipt order={orderInfo} items={currentOrder} />
            </div>
         </div>

         <button
            onClick={printaj}
            disabled={ !currentOrder.length}
         >
            Ispiši
         </button>
      </div>
   );
};

export default ReceiptPrintButton;
