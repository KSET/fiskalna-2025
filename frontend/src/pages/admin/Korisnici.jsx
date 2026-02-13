import { useState, useEffect } from "react";
import "../../styles/Pages.css";

export default function Korisnici() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", role: "USER" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/users", {
        credentials: "include",
      });
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setEditData({
      name: user.name,
      role: user.role,
    });
  };

  const handleSave = async (userId) => {
    try {
      await fetch(`http://localhost:3000/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editData),
      });
      alert("Korisnik je ažuriran!");
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm("Sigurno želite obrisati ovog korisnika?")) {
      try {
        await fetch(`http://localhost:3000/api/users/${userId}`, {
          method: "DELETE",
          credentials: "include",
        });
        alert("Korisnik je obrisan!");
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name) {
      alert("Molimo unesite email i ime!");
      return;
    }
    try {
      await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newUser),
      });
      alert("Korisnik je kreiran!");
      setNewUser({ email: "", name: "", role: "USER" });
      setShowNewUserForm(false);
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Greška pri kreiranju korisnika");
    }
  };

  if (loading) return <div className="page-container" style={{color: '#333', padding: '40px 20px'}}>Učitavanje...</div>;

  return (
    <div className="page-container">
      <h1>Upravljanje Korisnicima</h1>

      {!showNewUserForm ? (
        <button 
          onClick={() => setShowNewUserForm(true)}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          + Dodaj novog korisnika
        </button>
      ) : (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <h3>Kreiraj novog korisnika</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                flex: '1',
                minWidth: '200px'
              }}
            />
            <input
              type="text"
              placeholder="Ime"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                flex: '1',
                minWidth: '200px'
              }}
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              <option value="GUEST">GUEST</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCreateUser}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Kreiraj
            </button>
            <button
              onClick={() => setShowNewUserForm(false)}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Otkaži
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ime</th>
              <th>Email</th>
              <th>Ulogu</th>
              <th>Kreirano</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  {editingId === user.id ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                    />
                  ) : (
                    user.name
                  )}
                </td>
                <td>{user.email}</td>
                <td>
                  {editingId === user.id ? (
                    <select
                      value={editData.role}
                      onChange={(e) =>
                        setEditData({ ...editData, role: e.target.value })
                      }
                    >
                      <option>GUEST</option>
                      <option>USER</option>
                      <option>ADMIN</option>
                    </select>
                  ) : (
                    <span className={`badge-${user.role === "ADMIN" ? "danger" : "info"}`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString("hr-HR")}</td>
                <td className="actions">
                  {editingId === user.id ? (
                    <>
                      <button
                        onClick={() => handleSave(user.id)}
                        className="btn-small btn-success"
                      >
                        Spremi
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-small btn-secondary"
                      >
                        Otkaži
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(user)}
                        className="btn-small btn-primary"
                      >
                        Uredi
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn-small btn-danger"
                      >
                        Obriši
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="info-box">
        <h3>Informacije o ulogama:</h3>
        <ul>
          <li><strong>ADMIN</strong> - Puni pristup svim postavkama i funkcijama</li>
          <li><strong>USER</strong> - Pristup prodaji, računima i izvještajima</li>
          <li><strong>GUEST</strong> - Ograničeni pristup</li>
        </ul>
      </div>
    </div>
  );
}
