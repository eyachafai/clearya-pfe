import { useEffect, useState, useRef } from "react";
import { socket } from "../socket";


const NotificationsListener = () => {
    const [toast, setToast] = useState<any | null>(null);
    const [disabled, setDisabled] = useState(() => localStorage.getItem('notifications_disabled') === 'true');
    const disabledRef = useRef(disabled);

    // Écouter les changements de localStorage depuis TOUS les onglets/composants
    useEffect(() => {
        const handleStorageChange = () => {
            const newDisabled = localStorage.getItem('notifications_disabled') === 'true';
            setDisabled(newDisabled);
            disabledRef.current = newDisabled;
            console.log('[FRONT] Storage change detected, disabled:', newDisabled);
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Update disabledRef quand disabled change (local state)
    useEffect(() => {
        disabledRef.current = disabled;
        console.log('[FRONT] Local disabled state changed to:', disabled);
    }, [disabled]);

    // Listen for notifications
    useEffect(() => {
        // Remove any existing listeners first
        socket.off("notification");
        
socket.on("notification", notif => {
    console.log("[FRONT] Notification reçue, disabled:", disabledRef.current);

    if (!disabledRef.current) {

        setToast(notif);

        if (
            'Notification' in window &&
            Notification.permission === 'granted'
        ) {
            new Notification(notif.titre, {
                body: notif.message,
                icon: '/clearya-logo.svg'
            });
        }

        setTimeout(() => setToast(null), 5000);
    } else {
        console.log('[FRONT] Notification bloquée');
    }
});        
        return () => {
            socket.off("notification");
        };
    }, []);

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
