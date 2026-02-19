import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/Pages.css";
import ReceiptPrintButton from "./admin/Racun";

const CroatianDateTime = () => {
  const date = new Date();
  const pad = (num) => num.toString().padStart(2, "0");
  const formattedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}. ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return formattedDate;
};

export default function Prodaja() {
  const [articles, setArticles] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("Gotovina");
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [offlineCount, setOfflineCount] = useState(0);

  const syncOfflineReceipts = async () => {
    const offline = JSON.parse(localStorage.getItem("offline_receipts") || "[]");
    setOfflineCount(offline.length);
    if (offline.length === 0) return;

    console.log(`Pokušavam sinkronizirati ${offline.length} offline računa...`);
    let remainingOffline = [...offline];

    for (const receipt of offline) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(receipt),
        });

        if (res.ok) {
          remainingOffline = remainingOffline.filter(r => r.receiptNumber !== receipt.receiptNumber);
          localStorage.setItem("offline_receipts", JSON.stringify(remainingOffline));
          setOfflineCount(remainingOffline.length);
        } else {
          const errorData = await res.json();
          if (errorData.error && errorData.error.includes("Unique constraint failed")) {
            remainingOffline = remainingOffline.filter(r => r.receiptNumber !== receipt.receiptNumber);
            localStorage.setItem("offline_receipts", JSON.stringify(remainingOffline));
            setOfflineCount(remainingOffline.length);
          } else {
            break;
          }
        }
      } catch (e) {
        break;
      }
    }

    if (remainingOffline.length === 0 && offline.length > 0) {
      alert("Svi offline računi su uspješno sinkronizirani!");
    }
  };

  useEffect(() => {
    fetchArticles();
    syncOfflineReceipts();
  }, []);

  const totalBrutto = selectedItems.reduce((sum, item) =>
    sum + (Number(item.price) * Number(item.quantity)), 0
  );

  const totalNetto = selectedItems.reduce((sum, item) => {
    const price = Number(item.price);
    const qty = Number(item.quantity);
    const rate = Number(item.taxRate || 0);
    const lineBrutto = price * qty;
    const lineNetto = lineBrutto / (1 + (rate / 100));
    return sum + lineNetto;
  }, 0);

  const totalTax = totalBrutto - totalNetto;

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/articles`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        setArticles([]);
      } else {
        setArticles(data.filter(a => a.active));
      }
      setLoading(false);
    } catch (error) {
      setArticles([]);
      setLoading(false);
    }
  };

  const addItem = (article) => {
    const existing = selectedItems.find(item => item.articleId === article.id);
    if (existing) {
      setSelectedItems(selectedItems.map(item =>
        item.articleId === article.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSelectedItems([...selectedItems, {
        articleId: article.id,
        name: article.name,
        price: article.price,
        quantity: 1,
        taxRate: article.taxRate,
        description: article.description,
        unit: article.unit,
      }]);
    }
  };

  const removeItem = (articleId) => {
    setSelectedItems(selectedItems.filter(item => item.articleId !== articleId));
  };

  const clearCart = () => setSelectedItems([]);

  const updateQuantity = (articleId, quantity) => {
    if (quantity <= 0) {
      removeItem(articleId);
    } else {
      setSelectedItems(selectedItems.map(item =>
        item.articleId === articleId ? { ...item, quantity } : item
      ));
    }
  };

  const handleCheckout = async () => {
    if (selectedItems.length === 0) return;

    const receiptNumber = `RCN-${Date.now()}`;
    const paymentTypeMap = { "Gotovina": "GOTOVINA", "Kartica": "KARTICA" };
    const paymentTypeValue = paymentTypeMap[paymentMethod] || "GOTOVINA";

    const receiptData = {
      receiptNumber,
      invoiceType: "RAČUN",
      paymentType: paymentTypeValue,
      brutto: parseFloat(totalBrutto.toFixed(2)),
      netto: parseFloat(totalNetto.toFixed(2)),
      taxValue: parseFloat(totalTax.toFixed(2)),
      currency: "EUR",
      items: selectedItems.map(item => ({
        articleId: item.articleId,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        taxRate: item.taxRate || 0,
        unit: item.unit,
      })),
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(receiptData),
      });

      if (response.ok) {
        const receipt = await response.json();
        return receipt;
      } else {
        const error = await response.json();
        alert("Greška: " + (error.error || "Nepoznata greška"));
        return null;
      }
    } catch (error) {
      console.warn("Mreža nije dostupna. Spremanje lokalno...");
      const offlineItems = JSON.parse(localStorage.getItem("offline_receipts") || "[]");
      offlineItems.push({ ...receiptData, needsSync: true, timeSaved: new Date() });
      localStorage.setItem("offline_receipts", JSON.stringify(offlineItems));
      setOfflineCount(offlineItems.length);
      alert("Račun spremljen lokalno (Offline mod). Sinkronizirajte unutar 48h!");
      return true;
    }
  };

  const handleFiskaliziraj = async (printFunction) => {
    const receipt = await handleCheckout();
    if (receipt) {
      const buildPoreznaLink = (jir, dateStr, brutto) => {
        if (!jir) return "";
        const d = new Date(dateStr);
        const pad = (n) => n.toString().padStart(2, "0");
        const datv = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
        const iznInt = Math.round(Math.abs(brutto) * 100);
        const iznFormatted = Math.floor(iznInt / 100).toString().padStart(8, "0") + "," + (iznInt % 100).toString().padStart(2, "0");
        return `https://porezna.gov.hr/rn?jir=${jir}&datv=${datv}&izn=${iznFormatted}`;
      };
      printFunction({
        num: receipt.invoiceNumber ?? "",
        payment: paymentMethod,
        items: selectedItems,
        time: CroatianDateTime(),
        cashier: "doria",
        base: receipt.netto ?? 0,
        tax: receipt.taxValue ?? 0,
        jir: receipt.jir ?? "",
        zki: receipt.zki ?? "",
        link: buildPoreznaLink(receipt.jir, receipt.invoiceDate || receipt.createdAt, receipt.brutto ?? 0),
        phone: "0916043415",
        email: "info@kset.org",
      });
    }
  };

  if (loading) return <div className="page-container" style={{ color: '#333', padding: '40px 20px' }}>Učitavanje...</div>;

  const categoryId = searchParams.get("category");
  const filteredArticles = categoryId ? articles.filter(a => a.categoryId == categoryId) : articles;

  return (
    <div className="page-container">
      <h1>
        Prodaja
        {offlineCount > 0 && (
          <span style={{ color: 'red', fontSize: '14px', marginLeft: '10px' }}>
            ({offlineCount} čekaju sinkronizaciju)
          </span>
        )}
      </h1>

      <div className="prodaja-layout">
        <div className="articles-grid">
          <h2>{categoryId ? "Artikli u kategoriji" : "Svi artikli"}</h2>
          <div className="grid">
            {filteredArticles.map(article => (
              <div key={article.id} className="article-card" onClick={() => addItem(article)} style={{ cursor: 'pointer' }}>
                <h3>{article.name}</h3>
                <p className="code">Kod: {article.productCode}</p>
                <p className="price"><span className="currency">{article.price.toFixed(2)}</span></p>
                {article.description && <p className="desc">{article.description}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="cart">
          <h2>Košarica</h2>
          {selectedItems.length === 0 ? (
            <p className="empty-cart">Košarica je prazna</p>
          ) : (
            <>
              <div className="cart-items">
                {selectedItems.map(item => (
                  <div key={item.articleId} className="cart-item">
                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      <p><span className="currency">{item.price.toFixed(2)}</span> / kom</p>
                    </div>
                    <div className="cart-item-controls">
                      <div className="quantity-control">
                        <button onClick={() => updateQuantity(item.articleId, item.quantity - 1)}>-</button>
                        <input
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.articleId, parseInt(e.target.value))}
                        />
                        <button onClick={() => updateQuantity(item.articleId, item.quantity + 1)}>+</button>
                      </div>
                      <div className="item-total">
                        <span className="currency">{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <button onClick={() => removeItem(item.articleId)} className="btn-danger cart-remove">✕</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="checkout-section">
                <div className="payment-method">
                  <label>Način plaćanja:</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option>Gotovina</option>
                    <option>Kartica</option>
                  </select>
                </div>

                <div className="total">
                  <strong>Ukupno: <span className="currency">{totalBrutto.toFixed(2)}</span></strong>
                </div>

                <ReceiptPrintButton
                  order={{
                    num: "",
                    payment: paymentMethod,
                    items: selectedItems,
                    time: CroatianDateTime(),
                    cashier: "doria",
                    base: 0,
                    tax: 0,
                    jir: "",
                    zki: "",
                    link: "",
                    phone: "0916043415",
                    email: "info@kset.org",
                  }}
                  onFiskaliziraj={handleFiskaliziraj}
                  onAfterPrint={() => setSelectedItems([])}
                />
                <button onClick={clearCart} className="btn-danger">Isprazni košaricu</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
