import { useState, useEffect } from "react";
import "../styles/Pages.css";
import ReceiptPrintButton from "./admin/Racun";

const CroatianDateTime = () => {
  const date = new Date();
  const pad = (num) => num.toString().padStart(2, "0");

  const formattedDate =
    `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}. ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return formattedDate
};


export default function Prodaja() {
  const [articles, setArticles] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("Gotovina");
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchArticles();

  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/articles", {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        console.error("API error or invalid data:", data);
        setArticles([]);
      } else {
        setArticles(data.filter(a => a.active));
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching articles:", error);
      setArticles([]);
      setLoading(false);
    }
  };

  const addItem = (article) => {
    const existing = selectedItems.find(item => item.articleId === article.id);
    if (existing) {
      setSelectedItems(
        selectedItems.map(item =>
          item.articleId === article.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          articleId: article.id,
          name: article.name,
          price: article.price,
          quantity: 1,
          taxRate: article.taxRate,
          description: article.description,
          unit: article.unit,
        },
      ]);
    }
  };

  const removeItem = (articleId) => {
    setSelectedItems(selectedItems.filter(item => item.articleId !== articleId));
  };

  const clearCart = () => {
    console.log(selectedItems)
    setSelectedItems([])
  }


  const updateQuantity = (articleId, quantity) => {
    if (quantity <= 0) {
      removeItem(articleId);
    } else {
      setSelectedItems(
        selectedItems.map(item =>
          item.articleId === articleId ? { ...item, quantity } : item
        )
      );
    }
  };

  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (selectedItems.length === 0) return;

    try {
      const receiptNumber = `RCN-${Date.now()}`;
      
      // Calculate totals
      const brutto = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const netto = 0; // Calculate based on tax rates
      const taxValue = 0; // Calculate based on tax rates
      
      // Validate payment type is uppercase
      const paymentTypeMap = {
        "Gotovina": "GOTOVINA",
        "Kartica": "KARTICA"
      };
      const paymentTypeValue = paymentTypeMap[paymentMethod] || "GOTOVINA";
      
      const response = await fetch("http://localhost:3000/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiptNumber,
          invoiceType: "RAĆUN",
          paymentType: paymentTypeValue,
          brutto,
          netto,
          taxValue,
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
        }),
      });

      if (response.ok) {
        alert("Račun je uspješno kreiran!");
        setSelectedItems([]);
      } else {
        const error = await response.json();
        alert("Greška: " + (error.error || "Nepoznata greška"));
      }
    } catch (error) {
      console.error("Error creating receipt:", error);
      alert("Greška pri kreiranju računa: " + error.message);
    }
  };

  if (loading) return <div className="page-container" style={{ color: '#333', padding: '40px 20px' }}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <h1>Prodaja</h1>
      <div className="prodaja-layout">
        <div className="articles-grid">
          <h2>Dostupni artikli</h2>
          <div className="grid">
            {articles.map(article => (
              <div key={article.id} className="article-card">
                <h3>{article.name}</h3>
                <p className="code">Kod: {article.productCode}</p>
                <p className="price">€{article.price.toFixed(2)}</p>
                <p className="desc">{article.description}</p>
                <button onClick={() => addItem(article)} className="btn-primary">
                  Dodaj
                </button>
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
                    <div>
                      <strong>{item.name}</strong>
                      <p>€{item.price.toFixed(2)} x</p>
                    </div>
                    <div className="quantity-control">
                      <button onClick={() => updateQuantity(item.articleId, item.quantity - 1)} style={{ color: "black" }}>
                        -
                      </button>
                      <input
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.articleId, parseInt(e.target.value))
                        }
                      />
                      <button onClick={() => updateQuantity(item.articleId, item.quantity + 1)} style={{ color: "black" }}>
                        +
                      </button>
                    </div>
                    <div className="item-total">
                      €{(item.price * item.quantity).toFixed(2)}
                    </div>
                    <button onClick={() => removeItem(item.articleId)} className="btn-danger">
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="checkout-section">
                <div className="payment-method">
                  <label>Način plaćanja:</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option>Gotovina</option>
                    <option>Karticom</option>
                  </select>
                </div>

                <div className="total">
                  <strong>Ukupno: €{total.toFixed(2)}</strong>
                </div>

                <button onClick={handleCheckout} className="btn-success">
                  Završi Prodaju
                </button>
                <button onClick={clearCart} className="btn-danger">
                  Isprazni košaricu
                </button>

                <p></p>

                <ReceiptPrintButton order={{
                  num: `RCN-${Date.now()}`,
                  payment: paymentMethod,
                  items: selectedItems,
                  time: CroatianDateTime(),
                  cashier: "doria",
                  base: 0, // todo 
                  tax: 0,
                  jir: 4332,
                  zki: 3924,
                  link: "https://jobfair.fer.unizg.hr/",
                  phone: "0916043415",
                  email: "info@kset.org",
                }} ></ReceiptPrintButton>
                {/* <button onClick={printCart} className="btn-primary" style={{ width: "100%" }}>
                  Ispiši
                </button> */}


              </div>
            </>
          )}
        </div>
      </div>

    </div>

  );
}
