import { useEffect } from "react";

export default function Login() {
  useEffect(() => {
    // Provjera errora
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      alert("Nije vam dozvoljen pristup");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const login = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%',
        borderTop: '4px solid #FF8C04'
      }}>
        <h1 style={{ color: '#FF8C04', marginBottom: '6px', fontSize: '28px', fontWeight: '700' }}>
          Fiskalna 2026
        </h1>
        <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>
          Sistem za upravljanje prodajom
        </p>
        <button onClick={login} style={{
          background: '#FF8C04',
          color: 'white',
          border: 'none',
          padding: '12px 30px',
          fontSize: '16px',
          borderRadius: '8px',
          cursor: 'pointer',
          width: '100%',
          fontWeight: '600',
          transition: 'background-color 0.25s'
        }}
          onMouseEnter={e => e.target.style.backgroundColor = '#e67d03'}
          onMouseLeave={e => e.target.style.backgroundColor = '#FF8C04'}
        >
          Prijava sa Googlom
        </button>
      </div>
    </div>
  );
}
