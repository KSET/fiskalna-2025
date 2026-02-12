import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    fetch("http://localhost:3000/auth/me", {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => setUser(data));
  }, []);

  if (user === undefined) return <div>Loading...</div>;

  if (!user) return <Navigate to="/" />;

  return children;
}
