import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function PublicRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    fetch("http://localhost:3000/auth/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) return null;

  if (user) return <Navigate to="/home" />;

  return children;
}
