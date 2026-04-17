import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

import { Utilisateur } from '../../types/utilisateur';
import { Quota } from '../../types/quota';


const QuotaAdmin: React.FC = () => {
    const [users, setUsers] = useState<Utilisateur[]>([]);
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [editValues, setEditValues] = useState<{ [userId: number]: number }>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Récupère tous les utilisateurs
        fetch('/api/admin/utilisateurs')
            .then(res => res.json())
            .then(data => setUsers(data));
        // Récupère tous les quotas
        fetch('/api/')
            .then(res => res.json())
            .then(data => setQuotas(data));
    }, []);

    const getQuotaForUser = (userId: number) => {
        const q = quotas.find(q => q.user_id === userId);
        return q ? q.quota_mb : 100; // 100 Mo par défaut
    };
    const getUsedForUser = (userId: number) => {
        const q = quotas.find(q => q.user_id === userId);
        return q ? q.used_mb : 0;
    };

    const handleInputChange = (userId: number, value: string) => {
        setEditValues({ ...editValues, [userId]: Number(value) });
    };

    const handleSave = async (userId: number) => {
        setLoading(true);
        const quota_mb = editValues[userId] ?? 100;
        await fetch(`/api/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quota_mb })
        });
        // Refresh quotas
        const res = await fetch('/api/');
        setQuotas(await res.json());
        setLoading(false);
    };

    return (
        <div className="quota-admin-wrapper">
            <style>{`
            
        .quota-admin-wrapper {
          max-width: 1200px;
          flex: 3; 
          margin: 40px auto;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          padding: 48px 40px;
          font-family: 'Roboto', 'Open Sans', Arial, sans-serif;
        }
        .quota-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 10px;
          margin-bottom: 24px;
        }
        .quota-table th {
          background: #2d3a4a;
          color: #fff;
          padding: 16px 12px;
          font-size: 1.08rem;
          border-top-left-radius: 10px;
          border-top-right-radius: 10px;
        }
        .quota-table td {
          background: #f8fafc;
          padding: 16px 12px;
          font-size: 1.08rem;
          border-bottom: 1px solid #e0e6ed;
        }
        .quota-table tr {
          border-radius: 12px;
          transition: box-shadow 0.2s, background 0.2s;
        }
        .quota-table tr:hover td {
          background: #eaf1fb;
          box-shadow: 0 2px 8px rgba(34,42,68,0.06);
        }
        .quota-btn {
          background: #198754;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 8px 18px;
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .quota-btn:disabled {
          background: #b5c7b7;
          cursor: not-allowed;
        }
        .quota-input {
          border-radius: 6px;
          border: 1px solid #bbb;
          padding: 6px 10px;
          font-size: 1rem;
          width: 90px;
          margin-right: 8px;
        }
        .dashboard-side {
          min-width: 340px;
          max-width: 420px;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          padding: 32px;
          margin-top: 24px;
          height: fit-content;
          flex: 1;
        }

        @media (max-width: 768px) {
  .quota-container {
    flex-direction: column;
  }
}

      `}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, width: '100%', maxWidth: '100%' }}>
                <h2 style={{ fontWeight: 'bold', fontSize: '1.7rem', color: '#2d3a4a', margin: 0 }}>Gestion des quotas utilisateurs</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <img src="./././public/clearya-logo.svg" alt="Logo" style={{ height: 48, marginLeft: 24 }} />
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="24" cy="24" r="22" fill="#eaf1fb" stroke="#3b4a5a" strokeWidth="3" />
                        <rect x="16" y="16" width="16" height="16" rx="4" fill="#3b4a5a" />
                        <rect x="22" y="22" width="4" height="10" rx="2" fill="#fff" />
                        <rect x="22" y="18" width="4" height="2" rx="1" fill="#fff" />
                    </svg>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 40 }}>
                <div className="quota-admin-wrapper" style={{ flex: 3, minWidth: 600 }}>
                    <table className="quota-table">
                        <thead>
                            <tr>
                                <th>Utilisateur</th>
                                <th>Email</th>
                                <th>Quota (Mo)</th>
                                <th>Utilisé (Mo)</th>
                                <th>Modifier</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>{u.username}</td>
                                    <td>{u.email}</td>
                                    <td>{getQuotaForUser(u.id)}</td>
                                    <td>{getUsedForUser(u.id)}</td>
                                    <td>
                                        <input
                                            type="number"
                                            min={1}
                                            value={editValues[u.id] ?? getQuotaForUser(u.id)}
                                            onChange={e => handleInputChange(u.id, e.target.value)}
                                            className="quota-input"
                                        />
                                        <button
                                            onClick={() => handleSave(u.id)}
                                            disabled={loading}
                                            className="quota-btn"
                                        >Enregistrer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="dashboard-side" style={{ minWidth: 340, maxWidth: 420, background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: 32, marginTop: 24, height: 'fit-content', flex: 1 }}>
                    <h3 style={{ color: '#2d3a4a', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: 24 }}>Tableau de bord quotas</h3>
                    <div style={{ marginBottom: 18, fontWeight: 'bold', color: '#198754' }}>
                        Utilisation totale : {quotas.reduce((acc, q) => acc + q.used_mb, 0)} Mo / {quotas.reduce((acc, q) => acc + q.quota_mb, 0)} Mo
                    </div>
                    {/* Bar Chart: Used quota per user (Recharts) */}
                    <div style={{ marginBottom: 24, width: '100%', height: 220 }}>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={users.map(u => ({
                                name: u.username,
                                used: quotas.find(q => q.user_id === u.id)?.used_mb || 0
                            }))}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="used" fill="#198754" name="Utilisé (Mo)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Pie Chart: Quota distribution (Recharts) */}
                    <div style={{ marginBottom: 24, width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={users.map((u, i) => ({
                                        name: u.username,
                                        value: quotas.find(q => q.user_id === u.id)?.quota_mb || 100
                                    }))}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={70}
                                    label
                                >
                                    {(users.map((u, i) => (
                                        <Cell key={u.id} fill={["#198754", "#2d3a4a", "#dc3545", "#ffc107", "#0dcaf0", "#6610f2", "#fd7e14", "#6f42c1", "#20c997", "#adb5bd"][i % 10]} />
                                    )))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {users.map(u => {
                            const q = quotas.find(q => q.user_id === u.id);
                            const used = q ? q.used_mb : 0;
                            const quota = q ? q.quota_mb : 100;
                            const percent = Math.round((used / quota) * 100);
                            return (
                                <div key={u.id} style={{ marginBottom: 18 }}>
                                    <div style={{ fontWeight: 'bold', color: '#2d3a4a', marginBottom: 2 }}>{u.username}</div>
                                    <div style={{ fontSize: '0.98rem', color: '#888', marginBottom: 4 }}>{u.email}</div>
                                    <div style={{ background: '#eaf1fb', borderRadius: 8, height: 18, position: 'relative', marginBottom: 4 }}>
                                        <div style={{ width: `${Math.min(percent, 100)}%`, background: percent < 90 ? '#198754' : '#dc3545', height: '100%', borderRadius: 8, transition: 'width 0.3s' }}></div>
                                        <span style={{ position: 'absolute', left: 10, top: 0, fontSize: '0.95rem', color: '#222', fontWeight: 'bold' }}>{used} / {quota} Mo</span>
                                    </div>
                                    <div style={{ fontSize: '0.95rem', color: percent < 90 ? '#198754' : '#dc3545', fontWeight: 'bold' }}>{percent}% utilisé</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuotaAdmin;