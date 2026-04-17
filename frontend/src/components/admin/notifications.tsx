import { useState, useEffect } from 'react';
import { useKeycloak } from "@react-keycloak/web";

const Notifications = () => {
  const [titre, setTitre] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { keycloak } = useKeycloak();
  const user = keycloak.tokenParsed;
  const [userId, setUserId] = useState<number | null>(null);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id || user?.sub) {
      fetch(`/api/users/by-keycloak/${user?.id || user?.sub}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => setUserId(data?.id || null));
    }
  }, [user?.id, user?.sub]);
  const envoye_par = userId;

  useEffect(() => {
    if (envoye_par) {
      fetch(`http://localhost:5000/api/notifications/by-admin/${envoye_par}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setSentNotifications(Array.isArray(data) ? data : []));
    }
  }, [envoye_par, success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);
    if (!envoye_par) {
      setError("Impossible d'identifier l'expéditeur. Veuillez réessayer.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/notifications/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre, message, envoye_par, type: "global" })
      });
      if (res.ok) {
        setSuccess("Notification envoyée à tous les utilisateurs !");
        setTitre("");
        setMessage("");
      } else {
        const data = await res.json();
        setError(data.error || "Erreur lors de l'envoi");
      }
    } catch (err) {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '82vh',
      background: '#f5f6fa',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 40
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        padding: 40,
        maxWidth: 500,
        width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div style={{
          background: '#eaf1fb',
          borderRadius: '50%',
          width: 56,
          height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18
        }}>
          <span style={{ fontSize: 28 }}>🔔</span>
        </div>
        <h2 style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 8, textAlign: 'center' }}>Envoyer une notification globale</h2>
        <div style={{ color: '#888', fontSize: 15, marginBottom: 18, textAlign: 'center' }}>Ce message sera envoyé à tous les utilisateurs.</div>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="text"
            placeholder="Titre de la notification"
            value={titre}
            onChange={e => setTitre(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: 12, border: '1px solid #eaf1fb', fontSize: 16, background: '#f7fafd', marginBottom: 2 }}
          />
          <textarea
            placeholder="Message de la notification"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={4}
            style={{ padding: '12px', borderRadius: 12, border: '1px solid #eaf1fb', fontSize: 16, background: '#f7fafd', resize: 'none', marginBottom: 2 }}
          />
          <button
            type="submit"
            disabled={loading || !envoye_par}
            style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 'bold', fontSize: 17, cursor: 'pointer', marginTop: 8, boxShadow: '0 2px 8px #eaf1fb' }}
          >{loading ? 'Envoi...' : 'Envoyer à tous'}</button>
        </form>
        {success && <div style={{ color: '#25412cff', marginTop: 18 }}>{success}</div>}
        {error && <div style={{ color: '#3f2427ff', marginTop: 18 }}>{error}</div>}
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        padding: 32,
        maxWidth: 800,
        width: '100%',
        minHeight: 420,
        maxHeight: 520,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 18 }}>Notifications envoyées</h3>
        {sentNotifications.length === 0 ? (
          <div style={{ color: '#888', fontSize: 16 }}>Aucune notification envoyée.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
            {sentNotifications.map((notif, idx) => (
              <li key={notif.id || idx} style={{ background: '#f5f6fa', borderRadius: 10, marginBottom: 14, padding: 18, boxShadow: '0 2px 8px #eaf1fb' }}>
                <div style={{ fontWeight: 'bold', fontSize: 17, color: '#222' }}>{notif.titre}</div>
                <div style={{ color: '#555', fontSize: 15, marginTop: 6 }}>{notif.message}</div>
                <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                  {notif.date && `Envoyée le ${new Date(notif.date).toLocaleString()}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Notifications;