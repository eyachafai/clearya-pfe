import { useEffect, useState } from 'react';
import { FaSyncAlt } from "react-icons/fa";
import { JournalEntry } from '../.././types/journal_cnx';

const JournalConnexionPage = () => {
  const [logs, setLogs] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Charge uniquement depuis la BD locale
  const loadFromLocal = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/journal-connexions/local');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError("Erreur lors du chargement des logs.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFromLocal();
  }, []);

  const formatDate = (timestamp: number) => {
    if (!timestamp || isNaN(Number(timestamp))) return "";
    const date = new Date(Number(timestamp));
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(date);
  };

  // Filtrer uniquement LOGIN et LOGOUT
  const filteredLogs = logs.filter(log => log.type === "LOGIN" || log.type === "LOGOUT");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Journal de Connexion</h2>
        <button
          style={{
            background: "#4caf50",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            padding: "0.7rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={loadFromLocal}
          disabled={loading}
          title="Actualiser"
        >
          <FaSyncAlt />
        </button>
      </div>
      {loading ? (
        <p>Chargement en cours...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : filteredLogs.length === 0 ? (
        <p>Aucun log trouvé.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: 8 }}>Date/Heure</th>
              <th style={{ padding: 8 }}>Utilisateur</th>
              <th style={{ padding: 8 }}>Type d'événement</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td style={{ padding: 8 }}>{formatDate(log.timestamp)}</td>
                <td style={{ padding: 8 }}>{log.username || "?"}</td>
                <td style={{ padding: 8 }}>{log.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default JournalConnexionPage;
