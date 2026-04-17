import { useEffect, useState } from "react";
import { socket } from "../socket";

const NotificationsListener = () => {
    const [toast, setToast] = useState<any | null>(null);
    const [disabled, setDisabled] = useState(() => localStorage.getItem('notifications_disabled') === 'true');

    useEffect(() => {
        const onStorage = () => {
            setDisabled(localStorage.getItem('notifications_disabled') === 'true');
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    useEffect(() => {
        if (disabled) return;
        socket.on("notification", notif => {
            console.log("[FRONT] Notification reçue :", notif); // Log détaillé
            setToast(notif);
            setTimeout(() => setToast(null), 5000);
        });
        return () => {
            socket.off("notification");
            console.log("[FRONT] Écoute des notifications désactivée");
        };
    }, [disabled]);

    useEffect(() => {
        // Identification du socket auprès du serveur
        const userId = localStorage.getItem('utilisateur_id');
        console.log('[FRONT] Authentification socket avec userId:', userId);
        if (userId) {
            socket.emit('authenticate', { userId });
        }
    }, []);

    if (!toast) return null;
    return (
        <div style={{
            position: 'fixed', top: 30, right: 30, zIndex: 9999,
            background: 'rgba(40, 44, 52, 0.85)', color: '#fff', padding: 20, borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: 320, maxWidth: 380, fontFamily: 'system-ui, sans-serif', backdropFilter: 'blur(8px)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 22, marginRight: 10 }}>🔔</span>
                <span style={{ fontWeight: 600, letterSpacing: 1, color: '#bfc7d5', fontSize: 15 }}>NOTIFICATION</span>
                <span style={{ marginLeft: 'auto', color: '#bfc7d5', fontSize: 13 }}>now</span>
            </div>
            <div style={{ fontWeight: 'bold', fontSize: 18, color: '#fff' }}>{toast.titre}</div>
            <div style={{ marginTop: 6, fontSize: 16, color: '#e0e0e0' }}>{toast.message}</div>
            {toast.ticketId && (
                <a href={`/tickets/${toast.ticketId}`} style={{
                    display: 'inline-block',
                    marginTop: 12,
                    background: '#8cb6d5',
                    color: '#fff',
                    padding: '7px 18px',
                    borderRadius: 8,
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: 15
                }}>Voir le ticket</a>
            )}
            {toast.auteur?.username && (
                <div style={{ marginTop: 8, fontSize: 14, color: '#bfc7d5' }}>Par {toast.auteur.username}</div>
            )}
        </div>
    );
};

export default NotificationsListener;
