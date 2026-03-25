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
  const [categories, setCategories] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("Gotovina");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [activeLocation, setActiveLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    fetchCategories();

    const fetchLocations = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/prodajna-mjesta`, { credentials: "include" });
        const data = await response.json();
        if (response.ok && Array.isArray(data) && data.length > 0 && !selectedLocationId) {
          setSelectedLocationId(String(data[0].id));
        }
      } catch { /* ignore */ }
    };

    const fetchActiveLocation = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/active-location`, { credentials: "include" });
        const data = await response.json();
        setActiveLocation(data.prodajnoMjesto ?? null);
      } catch {
        setActiveLocation(null);
      }
    };

    fetchLocations();
    fetchActiveLocation();
  }, [selectedLocationId]);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/articles`, { credentials: "include" });
      const data = await response.json();
      setArticles(response.ok && Array.isArray(data) ? data.filter(a => a.active).map(a => ({ ...a, price: parseFloat(a.price), taxRate: parseFloat(a.taxRate) })) : []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`, { credentials: "include" });
      const data = await response.json();
      setCategories(response.ok && Array.isArray(data) ? data.filter(c => c.active) : []);
    } catch {
      setCategories([]);
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
      } catch {
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
      prodajnoMjestoId: selectedLocationId ? Number(selectedLocationId) : null,
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
    } catch {
      const offlineItems = JSON.parse(localStorage.getItem("offline_receipts") || "[]");
      offlineItems.push(receiptData);
      localStorage.setItem("offline_receipts", JSON.stringify(offlineItems));
      setOfflineCount(offlineItems.length);
      alert("Spremljeno offline.");
      return receiptData; 
    }
  };

  const handleFiskaliziraj = async (printFunction) => {
    if (isProcessing) return;
    setIsProcessing(true);
    const receipt = await handleCheckout();
    if (receipt) {
      const buildPoreznaLink = (jir, dateStr, brutto) => {
        if (!jir) return "";
        const d = new Date(dateStr);
        const pad = (n) => n.toString().padStart(2, "0");
        const datv = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
        const iznInt = Math.round(Math.abs(brutto) * 100);
        const iznFormatted = (brutto < 0 ? "-" : "") + Math.floor(iznInt / 100).toString().padStart(8, "0") + "," + (iznInt % 100).toString().padStart(2, "0");
        return `https://porezna.gov.hr/rn?jir=${jir}&datv=${datv}&izn=${iznFormatted}`;
      };

      if (receipt.prodajnoMjestoNaziv && activeLocation?.name !== receipt.prodajnoMjestoNaziv) {
        try {
          const locRes = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/active-location`, { credentials: "include" });
          const locData = await locRes.json();
          setActiveLocation(locData.prodajnoMjesto ?? null);
        } catch { /* ignore */ }
      }

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
        location: receipt.prodajnoMjestoNaziv || activeLocation?.name || "",
        link: buildPoreznaLink(receipt.jir, receipt.invoiceDate || receipt.createdAt || new Date(), receipt.brutto ?? totalBrutto),
        phone: "0916043415",
        email: "info@kset.org",
      });
    }
    else {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="page-container" style={{ color: '#333', padding: '40px 20px' }}>Učitavanje...</div>;

  const categoryId = searchParams.get("category");
  const filteredArticles = categoryId ? articles.filter(a => String(a.categoryId) === categoryId) : articles;

  return (
    <div className="page-container">
<style>{`
  @media (min-width: 768px) {
    .prodaja-layout {
      display: grid;
      grid-template-columns: 1fr 450px;
      gap: 20px;
      height: calc(100vh - 120px);
      align-items: start;
    }

    .articles-grid {
      height: 100%;
      overflow-y: auto;
      padding-right: 10px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 15px !important;
    }

    .article-card {
      min-height: 140px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 20px !important;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 12px !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: transform 0.1s, border-color 0.1s;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .article-card h3 {
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      margin: 0 0 8px 0;
    }

    .article-card:active {
      transform: scale(0.96);
      border-color: #667eea;
    }

    .cart {
      position: sticky;
      top: 0;
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #ddd;
      display: flex;
      flex-direction: column;
      max-height: 100%;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      height: auto !important;
    }

    .cart-items {
      flex: 1;
      overflow-y: auto !important;
      max-height: 45vh !important;
      margin-bottom: 15px;
    }
  }

  .quantity-control {
    display: flex;
    align-items: center;
  }

  .quantity-control button {
    width: 40px !important;
    height: 40px !important;
    font-size: 1.5rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 0 !important;
    padding: 0 !important;
    padding-bottom: 4px !important;
    cursor: pointer;
    background-color: #f8f9fa;
    border: 1px solid #ddd;
  }

  .quantity-control input {
    font-size: 1.1rem !important;
    width: 45px !important;
    height: 40px !important;
    text-align: center !important;
    border-top: 1px solid #ddd !important;
    border-bottom: 1px solid #ddd !important;
    border-left: none !important;
    border-right: none !important;
    background: white;
    margin: 0 !important;
  }

  .articles-grid::-webkit-scrollbar, .cart-items::-webkit-scrollbar {
    width: 6px;
  }
  .articles-grid::-webkit-scrollbar-thumb, .cart-items::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 10px;
  }
`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>Prodaja</h1>
          {activeLocation
            ? <span style={{ fontSize: '0.9rem', color: '#fff', background: '#e67e22', padding: '4px 10px', borderRadius: '20px' }}>Prodajno mjesto: {activeLocation.name}</span>
            : <span style={{ fontSize: '0.85rem', color: '#c0392b', background: '#fdecea', padding: '4px 10px', borderRadius: '20px' }}>Nije odabrano prodajno mjesto</span>
          }
        </div>
        {offlineCount > 0 && (
            <span style={{color: 'red', fontSize: '14px', marginLeft: '10px'}}> 
              ({offlineCount} čekaju sinkronizaciju)
            </span>
          )}
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
          <h2>{categoryId ? `Artikli u kategoriji ${categories.find(c => c.id === categoryId)?.name}` : "Svi artikli"}</h2>
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

        <div className="cart" style={{ height: 'auto', overflow: 'visible' }}>
          <h2>Košarica</h2>
          {selectedItems.length === 0 ? (
            <p className="empty-cart">Košarica je prazna</p>
          ) : (
            <>
              <div className="cart-items" style={{ maxHeight: 'none', overflow: 'visible' }}>
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
                <div className="payment-method" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Način plaćanja:</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label style={{ 
                      flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '5px', textAlign: 'center', cursor: 'pointer',
                      backgroundColor: paymentMethod === "Gotovina" ? "#667eea" : "white",
                      color: paymentMethod === "Gotovina" ? "white" : "#333"
                    }}>
                      <input 
                        type="radio" 
                        name="payment" 
                        value="Gotovina" 
                        checked={paymentMethod === "Gotovina"} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ display: 'none' }} 
                      />
                      Gotovina
                    </label>
                    <label style={{ 
                      flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '5px', textAlign: 'center', cursor: 'pointer',
                      backgroundColor: paymentMethod === "Kartica" ? "#667eea" : "white",
                      color: paymentMethod === "Kartica" ? "white" : "#333"
                    }}>
                      <input 
                        type="radio" 
                        name="payment" 
                        value="Kartica" 
                        checked={paymentMethod === "Kartica"} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ display: 'none' }}
                      />
                      Kartica
                    </label>
                  </div>
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
                  onAfterPrint={() => {
                    setSelectedItems([]);
                    setPaymentMethod("Gotovina");
                    setIsProcessing(false);
                  }}
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