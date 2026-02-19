import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/Pages.css";
import ReceiptPrintButton from "./admin/Racun";

const CroatianDateTime = () => {
  const date = new Date();
  const pad = (num) => num.toString().padStart(2, "0");
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}. ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function Prodaja() {
  const [articles, setArticles] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("Gotovina");
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const { totalBrutto, totalNetto, totalTax } = useMemo(() => {
    const brutto = selectedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const netto = selectedItems.reduce((sum, item) => {
      const lineBrutto = Number(item.price) * Number(item.quantity);
      return sum + (lineBrutto / (1 + (Number(item.taxRate || 0) / 100)));
    }, 0);
    return { totalBrutto: brutto, totalNetto: netto, totalTax: brutto - netto };
  }, [selectedItems]);

  useEffect(() => {
    const offline = JSON.parse(localStorage.getItem("offline_receipts") || "[]");
    setOfflineCount(offline.length);
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/articles`, { credentials: "include" });
      const data = await response.json();
      setArticles(response.ok && Array.isArray(data) ? data.filter(a => a.active) : []);
    } catch (error) {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineReceipts = async () => {
    const offline = JSON.parse(localStorage.getItem("offline_receipts") || "[]");
    if (offline.length === 0) return;

    setIsSyncing(true);
    let remainingOffline = [...offline];

    for (const receipt of offline) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(receipt),
        });

        const result = await res.json();

        if (res.ok || (result.error && result.error.toLowerCase().includes("unique constraint"))) {
          remainingOffline = remainingOffline.filter(r => r.receiptNumber !== receipt.receiptNumber);
          localStorage.setItem("offline_receipts", JSON.stringify(remainingOffline));
          setOfflineCount(remainingOffline.length);
        } else {
          alert(`Server je odbio račun ${receipt.receiptNumber}: ${result.error}`);
          break; 
        }
      } catch (e) {
        alert("Mreža nedostupna. Provjerite vezu.");
        break; 
      }
    }
    
    setIsSyncing(false);
    if (remainingOffline.length === 0 && offline.length > 0) alert("Svi računi sinkronizirani!");
  };

  const addItem = (article) => {
    setSelectedItems(prev => {
      const existing = prev.find(item => item.articleId === article.id);
      if (existing) {
        return prev.map(item => item.articleId === article.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { articleId: article.id, name: article.name, price: article.price, quantity: 1, taxRate: article.taxRate }];
    });
  };

  const updateQuantity = (articleId, quantity) => {
    if (quantity <= 0) {
      setSelectedItems(prev => prev.filter(item => item.articleId !== articleId));
    } else {
      setSelectedItems(prev => prev.map(item => item.articleId === articleId ? { ...item, quantity } : item));
    }
  };

  const removeItem = (articleId) => {
    setSelectedItems(prev => prev.filter(item => item.articleId !== articleId));
  };

  const handleCheckout = async () => {
    if (selectedItems.length === 0) return null;

    const receiptData = {
      receiptNumber: `RCN-${Date.now()}`,
      invoiceType: "RAČUN",
      paymentType: paymentMethod === "Kartica" ? "KARTICA" : "GOTOVINA",
      brutto: totalBrutto,
      netto: totalNetto,
      taxValue: totalTax,
      currency: "EUR",
      items: selectedItems.map(item => ({
        articleId: item.articleId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        taxRate: item.taxRate || 0,
      })),
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(receiptData),
      });

      if (response.ok) return await response.json();
      
      const error = await response.json();
      if (error.error?.toLowerCase().includes("unique constraint")) return receiptData;
      
      alert("Greška: " + (error.error || "Nepoznata greška"));
      return null;
    } catch (error) {
      const offlineItems = JSON.parse(localStorage.getItem("offline_receipts") || "[]");
      offlineItems.push(receiptData);
      localStorage.setItem("offline_receipts", JSON.stringify(offlineItems));
      setOfflineCount(offlineItems.length);
      alert("Spremljeno offline.");
      return receiptData; 
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
        num: receipt.invoiceNumber || receipt.receiptNumber,
        payment: paymentMethod,
        items: selectedItems,
        time: CroatianDateTime(),
        cashier: "doria",
        base: receipt.netto ?? totalNetto,
        tax: receipt.taxValue ?? totalTax,
        jir: receipt.jir ?? "",
        zki: receipt.zki ?? "",
        link: buildPoreznaLink(receipt.jir, receipt.invoiceDate || receipt.createdAt || new Date(), receipt.brutto ?? totalBrutto),
        phone: "0916043415",
        email: "info@kset.org",
      });
    }
  };

  if (loading) return <div className="page-container" style={{ color: '#333', padding: '40px 20px' }}>Učitavanje...</div>;

  const categoryId = searchParams.get("category");
  const filteredArticles = categoryId ? articles.filter(a => String(a.categoryId) === categoryId) : articles;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>
          Prodaja 
          {offlineCount > 0 && (
            <span style={{color: 'red', fontSize: '14px', marginLeft: '10px'}}> 
              ({offlineCount} čekaju sinkronizaciju)
            </span>
          )}
        </h1>

        {offlineCount > 0 && (
          <button 
            onClick={syncOfflineReceipts} 
            disabled={isSyncing}
            className="btn-sync"
            style={{
              backgroundColor: isSyncing ? '#ccc' : '#4CAF50',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              fontWeight: 'bold',
              cursor: isSyncing ? 'not-allowed' : 'pointer'
            }}
          >
            {isSyncing ? "Sinkronizacija u tijeku..." : `Sinkroniziraj račune (${offlineCount})`}
          </button>
        )}
      </div>
      
      <div className="prodaja-layout">
        <div className="articles-grid">
          <h2>{categoryId ? "Artikli u kategoriji" : "Svi artikli"}</h2>
          <div className="grid">
            {filteredArticles.map(article => (
              <div key={article.id} className="article-card" onClick={() => addItem(article)} style={{ cursor: 'pointer' }}>
                <h3>{article.name}</h3>
                <p className="code">Kod: {article.productCode}</p>
                <p className="price"><span className="currency">{article.price.toFixed(2)}</span></p>
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
                      <p><span className="currency">{item.price.toFixed(2)}</span> x {item.quantity}</p>
                    </div>
                    <div className="cart-item-controls">
                      <div className="quantity-control">
                        <button onClick={() => updateQuantity(item.articleId, item.quantity - 1)}>-</button>
                        <input
                          value={item.quantity}
                          readOnly
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

                <div className="total" style={{ margin: '20px 0', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                  <strong>Ukupno: <span className="currency">{totalBrutto.toFixed(2)}</span></strong>
                </div>

                <ReceiptPrintButton
                  order={{
                    num: "",
                    payment: paymentMethod,
                    items: selectedItems,
                    time: CroatianDateTime(),
                    cashier: "doria",
                    base: totalNetto,
                    tax: totalTax,
                    jir: "",
                    zki: "",
                    link: "",
                    phone: "0916043415",
                    email: "info@kset.org",
                  }}
                  onFiskaliziraj={handleFiskaliziraj}
                  onAfterPrint={() => setSelectedItems([])}
                />
                <button onClick={() => setSelectedItems([])} className="btn-danger" style={{ width: '100%', marginTop: '10px' }}>
                  Isprazni košaricu
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}