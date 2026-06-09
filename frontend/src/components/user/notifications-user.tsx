import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import dayjs from "dayjs";
import { FaBellSlash } from 'react-icons/fa';

const NotificationsUser = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [toast, setToast] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'today' | 'week' | 'earlier'>('today');
    const [disabled, setDisabled] = useState(() => localStorage.getItem('notifications_disabled') === 'true');
    const socketRef = useRef<any | null>(null);
    const disabledRef = useRef<boolean>(disabled);
    const timeoutRef = useRef<number | null>(null);
    const originalNotificationRef = useRef<any | null>(null);

    // Récupère les notifications existantes au chargement
    useEffect(() => {
        fetch("http://localhost:5000/api/notifications/notifications")
            .then(res => res.ok ? res.json() : [])
            .then(data => setNotifications(Array.isArray(data) ? data : []));
    }, []);

    // keep disabledRef up to date with state
    useEffect(() => {
        disabledRef.current = disabled;
    }, [disabled]);

    // When notifications are disabled, immediately hide any shown toast and clear its timer
    useEffect(() => {
        if (disabled) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            setToast(null);
        }
    }, [disabled]);

    // Écoute les notifications en temps réel : on connecte une fois au montage et on garde
    // la connexion tant que le composant est monté. Toujours sauvegarder la notif, mais
    // n'afficher le toast que si disabled === false (contrôlé via disabledRef).
    useEffect(() => {
        socketRef.current = io("http://localhost:5000");
        const s = socketRef.current;

        s.on("notification", (notif: any) => {
            // Toujours sauvegarder la notification
            setNotifications(prev => [notif, ...prev]);
            // N'afficher le toast que si les notifications sont activées
            if (!disabledRef.current) {
                setToast(notif);
                // store timer id so we can clear it if the user disables notifications
                timeoutRef.current = window.setTimeout(() => {
                    setToast(null);
                    timeoutRef.current = null;
                }, 5000);
            }
        });

        return () => {
            if (s) {
                s.off("notification");
                s.disconnect();
            }
            // cleanup any pending toast timer
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            socketRef.current = null;
        };
    }, []);

    // Override window.Notification while this component is mounted so that calls to
    // new Notification(...) respect the user's localStorage 'notifications_disabled' flag.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        originalNotificationRef.current = (window as any).Notification;

        const GuardedNotification: any = function(title: string, options?: NotificationOptions) {
            try {
                if (localStorage.getItem('notifications_disabled') === 'true') {
                    // Suppress creation of native notification
                    return undefined;
                }
            } catch (e) {
                // ignore localStorage errors
            }
            return new originalNotificationRef.current(title, options);
        };

        // preserve static members
        GuardedNotification.requestPermission = (...args: any[]) => originalNotificationRef.current.requestPermission(...args);
        Object.defineProperty(GuardedNotification, 'permission', {
            get: () => originalNotificationRef.current.permission
        });

        (window as any).Notification = GuardedNotification;

        // inform service worker about current preference if available
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SET_NOTIFICATIONS_DISABLED', value: disabled });
        }

        return () => {
            // restore original Notification constructor
            if (originalNotificationRef.current) {
                (window as any).Notification = originalNotificationRef.current;
            }
            // also notify service worker on unmount
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SET_NOTIFICATIONS_DISABLED', value: false });
            }
        };
    }, []);

    // Quand l'utilisateur clique sur l'icône, on synchronise avec le localStorage
    const handleToggleNotifications = () => {
        const newValue = !disabled;
        // update ref immediately to prevent race with incoming socket events
        disabledRef.current = newValue;
        // if disabling, clear any visible toast and its timer right away
        if (newValue) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            setToast(null);
        }
        setDisabled(newValue);
        localStorage.setItem('notifications_disabled', String(newValue));
        
        // Dispatch storage event to notify other listeners (like NotificationsListener)
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'notifications_disabled',
            newValue: String(newValue),
            oldValue: String(!newValue),
            storageArea: localStorage
        }));
        
        // Sync with backend
        const userId = localStorage.getItem('utilisateur_id');
        if (userId) {
            fetch(`http://localhost:5000/api/notifications/toggle-status/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disabled: newValue })
            }).catch(err => console.error('[NOTIF] Erreur sync backend:', err));
        }
        
        // notify a possible service worker so it can suppress notifications coming from push events
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                navigator.serviceWorker.controller.postMessage({ type: 'SET_NOTIFICATIONS_DISABLED', value: newValue });
            } catch (e) {
                // ignore
            }
        }
    };

    // Filtrage par date
    const now = dayjs();
    const todayList = notifications.filter(n => dayjs(n.date).isSame(now, 'day'));
    const weekList = notifications.filter(n => dayjs(n.date).isSame(now, 'week') && !dayjs(n.date).isSame(now, 'day'));
    const earlierList = notifications.filter(n => !dayjs(n.date).isSame(now, 'week'));

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e9effc 0%, #f5f7fa 100%)', padding: '48px 0' }}>
            <div style={{
                maxWidth: 880,
                margin: '0 auto',
                background: '#fff',
                borderRadius: 24,
                boxShadow: '0 8px 32px #bfc7d540',
                padding: '0 0 18px 0',
                overflow: 'hidden',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 28px 0 28px' }}>
                    <div style={{ fontWeight: 700, fontSize: 22, color: '#232323' }}>Historique des notifications</div>
                    <FaBellSlash style={{ color: disabled ? '#e57373' : '#bfc7d5', fontSize: 22, background: '#f5f7fa', borderRadius: 12, padding: 4, cursor: 'pointer' }} title={disabled ? "Notifications désactivées" : "Désactiver les notifications"} onClick={handleToggleNotifications} />
                </div>
                <div style={{ display: 'flex', gap: 0, margin: '24px 0 0 0', borderBottom: '1.5px solid #f0f1f7' }}>
                    <button onClick={() => setActiveTab('today')} style={{ flex: 1, background: '#fff', border: 'none', borderBottom: activeTab === 'today' ? '3px solid #8cb6d5' : 'none', color: activeTab === 'today' ? '#232323' : '#bfc7d5', fontWeight: 700, fontSize: 16, padding: '12px 0', cursor: 'pointer' }}>Aujourd'hui</button>
                    <button onClick={() => setActiveTab('week')} style={{ flex: 1, background: 'none', border: 'none', borderBottom: activeTab === 'week' ? '3px solid #8cb6d5' : 'none', color: activeTab === 'week' ? '#232323' : '#bfc7d5', fontWeight: 700, fontSize: 16, padding: '12px 0', cursor: 'pointer' }}>Cette semaine</button>
                    <button onClick={() => setActiveTab('earlier')} style={{ flex: 1, background: 'none', border: 'none', borderBottom: activeTab === 'earlier' ? '3px solid #8cb6d5' : 'none', color: activeTab === 'earlier' ? '#232323' : '#bfc7d5', fontWeight: 700, fontSize: 16, padding: '12px 0', cursor: 'pointer' }}>Antérieures</button>
                </div>
                <div style={{ padding: '0 28px', marginTop: 8 }}>
                    
                    {activeTab === 'today' && (
                        todayList.length === 0 ? (
                            <div style={{ color: '#888', fontSize: 16, textAlign: 'center', margin: '48px 0' }}>Aucune notification aujourd'hui.</div>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {todayList.map((notif, idx) => (
                                    <li key={notif.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: '1px solid #f0f1f7', padding: '22px 0 18px 0' }}>
                                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginTop: 2 }}>
                                            <span role="img" aria-label="notif">🔔</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 17, color: '#232323', marginBottom: 2 }}>{notif.titre}</div>
                                            <div style={{ color: '#7a869a', fontSize: 15, marginBottom: 2 }}>{notif.message}</div>
                                            <div style={{ color: '#bfc7d5', fontSize: 13, marginTop: 2 }}>
                                                {notif.date && `${dayjs(notif.date).format('h:mm A')}`}
                                                {notif.auteur?.username && ` · Par ${notif.auteur.username}`}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                    {activeTab === 'week' && (
                        weekList.length === 0 ? (
                            <div style={{ color: '#888', fontSize: 16, textAlign: 'center', margin: '48px 0' }}>Aucune notification cette semaine.</div>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {weekList.map((notif, idx) => (
                                    <li key={notif.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: '1px solid #f0f1f7', padding: '22px 0 18px 0' }}>
                                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginTop: 2 }}>
                                            <span role="img" aria-label="notif">🔔</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 17, color: '#232323', marginBottom: 2 }}>{notif.titre}</div>
                                            <div style={{ color: '#7a869a', fontSize: 15, marginBottom: 2 }}>{notif.message}</div>
                                            <div style={{ color: '#bfc7d5', fontSize: 13, marginTop: 2 }}>
                                                {notif.date && `${dayjs(notif.date).format('ddd h:mm A')}`}
                                                {notif.auteur?.username && ` · Par ${notif.auteur.username}`}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                    {activeTab === 'earlier' && (
                        earlierList.length === 0 ? (
                            <div style={{ color: '#888', fontSize: 16, textAlign: 'center', margin: '48px 0' }}>Aucune notification antérieure.</div>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {earlierList.map((notif, idx) => (
                                    <li key={notif.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: '1px solid #f0f1f7', padding: '22px 0 18px 0' }}>
                                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginTop: 2 }}>
                                            <span role="img" aria-label="notif">🔔</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 17, color: '#232323', marginBottom: 2 }}>{notif.titre}</div>
                                            <div style={{ color: '#7a869a', fontSize: 15, marginBottom: 2 }}>{notif.message}</div>
                                            <div style={{ color: '#bfc7d5', fontSize: 13, marginTop: 2 }}>
                                                {notif.date && `${dayjs(notif.date).format('DD/MM/YYYY h:mm A')}`}
                                                {notif.auteur?.username && ` · Par ${notif.auteur.username}`}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsUser;
