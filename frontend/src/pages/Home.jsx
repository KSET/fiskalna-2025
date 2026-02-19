import { useEffect, useState } from "react";
import "../styles/Pages.css";

export default function Home() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalReceipts: 0,
    todayReceipts: 0,
    todayTotal: 0,
    activeArticles: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/protected`, { credentials: "include" }).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_URL}/api/receipts`, { credentials: "include" }).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_URL}/api/articles`, { credentials: "include" }).then(res => res.json())
    ])
      .then(([userData, receipts, articles]) => {
        setUser(userData.user);

        const today = new Date().toISOString().split('T')[0];
        const todayReceipts = receipts.filter(r => {
          const rDate = new Date(r.createdAt).toISOString().split('T')[0];
          return rDate === today && r.status === 'RACUN';
        });

        setStats({
          totalReceipts: receipts.filter(r => r.status === 'RACUN').length,
          todayReceipts: todayReceipts.length,
          todayTotal: todayReceipts.reduce((sum, r) => sum + r.brutto, 0),
          activeArticles: articles.filter(a => a.active).length
        });

        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="page-container">Učitavanje...</div>;

  return (
    <div className="page-container">
      <h1>Dobrodošli, {user?.name || "Korisnik"}!</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #FF8C04'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Današnji promet</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF8C04' }}>
            <span className="currency">{stats.todayTotal.toFixed(2)}</span>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #28a745'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Računi danas</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>{stats.todayReceipts}</div>
        </div>

        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #17a2b8'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Ukupno računa</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#17a2b8' }}>{stats.totalReceipts}</div>
        </div>

        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #6c757d'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Aktivni artikli</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6c757d' }}>{stats.activeArticles}</div>
        </div>
      </div>
    </div>
  );
}
