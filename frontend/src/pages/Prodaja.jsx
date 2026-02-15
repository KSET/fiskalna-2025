import { useState, useEffect } from "react";
import "../styles/Pages.css";
import ReceiptPrintButton from "./admin/Racun";


export default function Prodaja() {
  const [articles, setArticles] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("Gotovina");
  const [loading, setLoading] = useState(true);

  const [order, setOrder] = useState(
    [
      {
        name: "Neš Umočit - single",
        quantity: 1,
        price: 3.0,
      },
    ]

  );



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
          price: article.brutIznos,
          quantity: 1,
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

  const printCart = () => {
    // todo
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
      const response = await fetch("http://localhost:3000/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          broj: receiptNumber,
          nacinPlacanja: paymentMethod,
          items: selectedItems,
        }),
      });

      if (response.ok) {
        alert("Račun je uspješno kreiran!");
        setSelectedItems([]);
      }
    } catch (error) {
      console.error("Error creating receipt:", error);
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
                <p className="code">Kod: {article.code}</p>
                <p className="price">€{article.brutIznos.toFixed(2)}</p>
                <p className="desc">{article.opis}</p>
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

                <ReceiptPrintButton currentOrder={selectedItems}></ReceiptPrintButton>
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
