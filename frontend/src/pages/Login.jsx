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
    window.location.href = "http://localhost:3000/auth/google";
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>Fiskalna 2025</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>Sistem za upravljanje prodajom</p>
        <button onClick={login} style={{
          background: '#667eea',
          color: 'white',
          border: 'none',
          padding: '12px 30px',
          fontSize: '16px',
          borderRadius: '5px',
          cursor: 'pointer',
          width: '100%',
          fontWeight: '600'
        }}>
          Prijava sa Googlom
        </button>
      </div>
    </div>
  );
}
