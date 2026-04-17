import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import dayjs from "dayjs";
import { FaBellSlash } from 'react-icons/fa';

const socket = io("http://localhost:5000");

const NotificationsUser = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [toast, setToast] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'today' | 'week' | 'earlier'>('today');
    const [disabled, setDisabled] = useState(() => localStorage.getItem('notifications_disabled') === 'true');

    // Récupère les notifications existantes au chargement
    useEffect(() => {
        fetch("http://localhost:5000/api/notifications/notifications")
            .then(res => res.ok ? res.json() : [])
            .then(data => setNotifications(Array.isArray(data) ? data : []));
    }, []);

    // Écoute les notifications en temps réel
    useEffect(() => {
        if (disabled) return;
        socket.on("notification", notif => {
            setNotifications(prev => [notif, ...prev]);
            setToast(notif);
            setTimeout(() => setToast(null), 5000); // cache le toast après 5s
        });
        return () => {
            socket.off("notification");
        };
    }, [disabled]);

    // Quand l'utilisateur clique sur l'icône, on synchronise avec le localStorage
    const handleToggleNotifications = () => {
        const newValue = !disabled;
        setDisabled(newValue);
        localStorage.setItem('notifications_disabled', String(newValue));
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
                    {toast && (
                        <div style={{
                            position: 'fixed', top: 60, right: 60, zIndex: 9999,
                            background: '#198754', color: '#fff', padding: 18, borderRadius: 10, boxShadow: '0 2px 12px #0002', minWidth: 250
                        }}>
                            <div style={{ fontWeight: 'bold', fontSize: 30 }}>{toast.titre}</div>
                            <div style={{ marginTop: 6 }}>{toast.message}</div>
                        </div>
                    )}
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
