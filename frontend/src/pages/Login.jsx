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
    <div>
      <h1>Login</h1>
      <button onClick={login}>Prijava sa Googlom</button>
    </div>
  );
}
