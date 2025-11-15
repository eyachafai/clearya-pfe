import { useEffect, useState } from "react";
import { Ticket } from "../../types/ticket";
import { Member } from "../../types/membre";
import { useKeycloak } from '@react-keycloak/web';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';


const TicketPage = ({ currentUserId: initialCurrentUserId, allMembers, projetId }: {
  currentUserId: number | null;
  allMembers: Member[];
  projetId?: number;
}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [etatOptions, setEtatOptions] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [titre, setTitre] = useState("");
  const [desc, setDesc] = useState("");
  const [assignee, setAssignee] = useState<number | "">("");
  const [filterEtat, setFilterEtat] = useState<string>("");
  const [filterAssignee, setFilterAssignee] = useState<number | "">("");
  const [showTicketsPage, setShowTicketsPage] = useState(true);
  const { keycloak } = useKeycloak();
  const [currentUserId, setCurrentUserId] = useState<number | null>(initialCurrentUserId);
  const [showStatsPage, setShowStatsPage] = useState(false);
  const [editTicketId, setEditTicketId] = useState<number | null>(null);
  const [editTitre, setEditTitre] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAssignee, setEditAssignee] = useState<number | "">("");

  console.log('Props received:', { currentUserId: initialCurrentUserId, allMembers, projetId });
  console.log('Keycloak tokenParsed:', keycloak?.tokenParsed);
  console.log('Detailed Keycloak tokenParsed:', keycloak?.tokenParsed);
  const isManager = keycloak?.tokenParsed?.realm_access?.roles?.includes('manager') || keycloak?.tokenParsed?.resource_access?.myapp?.roles?.includes('manager') || false;
  console.log('isManager:', isManager);

  useEffect(() => {
    if (!currentUserId) {
      const userIdFromStorage = Number(localStorage.getItem('utilisateur_id'));
      const userIdFromKeycloak = keycloak?.tokenParsed?.sub;

      if (userIdFromStorage) {
        console.log('currentUserId retrieved from localStorage:', userIdFromStorage);
        setCurrentUserId(userIdFromStorage);
      } else if (userIdFromKeycloak) {
        console.log('Attempting to resolve currentUserId from Keycloak sub:', userIdFromKeycloak);
        fetch(`/api/users/by-keycloak/${userIdFromKeycloak}`)
          .then(res => res.ok ? res.json() : Promise.reject(res))
          .then(data => {
            if (data && data.id) {
              console.log('currentUserId resolved from backend:', data.id);
              setCurrentUserId(data.id);
            } else {
              console.warn('Failed to resolve currentUserId from backend');
            }
          })
          .catch(err => {
            console.error('Error resolving currentUserId from backend:', err);
          });
      } else {
        console.warn('Unable to retrieve currentUserId');
      }
    }
  }, [keycloak, currentUserId]);

  useEffect(() => {
    // Charger la liste des états
    setEtatOptions(["nouveau", "en cours", "resolu", "fermée"]);


    // Charger les tickets (filtrage possible)
    let url = "http://localhost:5000/api/tickets"; // Correction de l'URL pour inclure le port du backend
    const params: string[] = [];
    if (filterEtat) params.push(`etat=${encodeURIComponent(filterEtat)}`);
    if (filterAssignee) params.push(`assignee_id=${filterAssignee}`);
    if (params.length) url += "?" + params.join("&");
    fetch(url)
      .then(r => r.json())
      .then(data => {
        console.log("Tickets API response:", data); // Ajout d'un log pour débogage
        if (Array.isArray(data)) {
          setTickets(data);
        } else {
          setTickets([]);
        }
      })
      .catch(err => {
        console.error("Erreur lors de la récupération des tickets:", err); // Ajout d'un log pour les erreurs
        setTickets([]);
      });
  }, [filterEtat, filterAssignee, showModal]);

  // Créer un ticket (manager uniquement)
  const handleCreate = async () => {
    let creatorId = currentUserId ?? Number(localStorage.getItem('utilisateur_id'));
    const assigneeId = Number(assignee);

    // If no creatorId, try to resolve via Keycloak sub -> backend
    if (!creatorId) {
      const sub = keycloak?.tokenParsed?.sub;
      if (sub) {
        try {
          const uRes = await fetch(`/api/users/by-keycloak/${sub}`);
          if (uRes.ok) {
            const uData = await uRes.json();
            if (uData && uData.id) creatorId = uData.id;
          }
        } catch (e) {
          console.error('Erreur fetch user by keycloak:', e);
        }
      }
    }

    // fallback: if we couldn't resolve the creator id, use the assignee as creator
    if (!titre.trim() || !assigneeId) {
      alert('Veuillez remplir le titre et choisir un assigné.');
      return;
    }
    if (!creatorId) {
      console.warn('create_by non résolu, fallback vers assignee');
      creatorId = assigneeId;
    }

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre,
          description: desc,
          assignee_id: assigneeId,
          created_by: creatorId
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Erreur création ticket: ' + (err?.error || res.statusText));
        return;
      }
      // success
      setShowModal(false);
      setTitre('');
      setDesc('');
      setAssignee('');
      // Refresh tickets
      const url = '/api/tickets' + (filterEtat ? `?etat=${filterEtat}` : '');
      const r2 = await fetch(url);
      setTickets(r2.ok ? await r2.json() : []);
      alert('Ticket créé avec succès');
    } catch (err) {
      console.error('Erreur handleCreate ticket:', err);
      alert('Erreur création ticket');
    }
  };

  const handleEtatChange = async (ticket: Ticket, newEtat: string) => {
    if (!etatOptions.includes(newEtat)) return;
    try {
      await fetch(`/api/tickets/${ticket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etat: newEtat }),
      });
      // Optimistic update
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, etat: newEtat } : t))
      );
    } catch (err) {
      console.error('Erreur mise à jour état du ticket:', err);
      alert('Erreur lors de la mise à jour de l\'état du ticket');
    }
  };

  const ticketStats = etatOptions.map((etat) => ({
    name: etat,
    count: Math.floor(tickets.filter((t) => t.etat === etat).length),
  }));



  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 32, minHeight: 340 }}>
      <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
        <button
          style={{
            background: "#222",
            color: "#fff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "1rem"
          }}
          onClick={() => {
            setShowTicketsPage(true);
          }}
        >
          Voir les tickets
        </button>

        {isManager && (
          <button
            style={{
              background: "#007bff",
              color: "#fff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "1rem"
            }}
            onClick={() => {
              setShowStatsPage(true);
              setShowTicketsPage(false);
            }}
          >
            Vue statistique
          </button>
        )}
      </div>
      {isManager && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <select
            value={filterEtat}
            onChange={(e) => setFilterEtat(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="">Filtrer par état</option>
            {etatOptions.map((etat) => (
              <option key={etat} value={etat}>{etat}</option>
            ))}
          </select>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(Number(e.target.value))}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="">Filtrer par assigné</option>
            {allMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.username}</option>
            ))}
          </select>
        </div>
      )}
      {/* Affichage des tickets à droite si showTicketsPage */}
      {showTicketsPage && (
        <div style={{
          background: "#f5f6fa",
          borderRadius: "12px",
          padding: "24px",
          marginTop: "16px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontWeight: "bold", color: "#222" }}>Tous les tickets du projet</h4>
            <button
              style={{
                background: "#222",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
              onClick={() => {
                setShowModal(true);
              }}
            >
              + Créer un ticket
            </button>
          </div>
          <ul style={{ marginTop: "16px", width: "100%" }}>
            {tickets.length === 0 ? (
              <li>Aucun ticket .</li>
            ) : (
              tickets.map(t => {
                const canUpdateData = Number(currentUserId) === Number(t.created_by);
                const canUpdateState = Number(currentUserId) === Number(t.assignee_id);

                return (
                  <li key={t.id} style={{
                    background: canUpdateState ? "#e0ffe0" : "#f5f6fa",
                    borderRadius: "8px",
                    padding: "12px 18px",
                    marginBottom: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontWeight: "bold",
                    color: "#222"
                  }}>
                    <span>
                      <span
                        style={{
                          background: "#eee",
                          color: "#333",
                          borderRadius: "6px",
                          padding: "2px 10px",
                          fontWeight: "bold",
                          fontSize: "0.95rem",
                          marginRight: "10px",
                        }}
                      >
                        {canUpdateState ? (
                          <select
                            value={t.etat}
                            onChange={(e) => {
                              const newEtat = e.target.value;
                              if (etatOptions.includes(newEtat)) {
                                handleEtatChange(t, newEtat);
                              }
                            }}
                            style={{
                              background: "#fff",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              fontSize: "0.95rem",
                              cursor: "pointer"
                            }}
                          >
                            {etatOptions.map((etat) => (
                              <option key={etat} value={etat}>{etat}</option>
                            ))}
                          </select>
                        ) : (
                          t.etat
                        )}
                      </span>
                      {t.titre} — {t.description}
                      <br />
                      <span style={{ fontWeight: "normal", fontSize: "1rem" }}>
                        Assigné à : {t.assignee?.username || t.assignee_id}
                      </span>
                      <span style={{ fontWeight: "normal", fontSize: "1rem", marginLeft: 12 }}>
                        Créé par : {t.creator?.username || t.created_by}
                      </span>
                      {t.resolved_at && (
                        <span
                          style={{
                            background: "#198754",
                            color: "#fff",
                            borderRadius: "6px",
                            padding: "2px 8px",
                            fontWeight: "bold",
                            marginLeft: "8px",
                            fontSize: "0.9rem",
                          }}
                        >
                          Résolu le {new Date(t.resolved_at).toLocaleString()}
                        </span>
                      )}
                    </span>
                    {canUpdateData && (
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {editTicketId === t.id ? (
                          <>
                            <button
                              onClick={async () => {
                                const payload = {
                                  titre: editTitre,
                                  description: editDesc,
                                  assignee_id: editAssignee,
                                };
                                await fetch(`/api/tickets/${t.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(payload),
                                });
                                setEditTicketId(null);
                                const res = await fetch("/api/tickets");
                                setTickets(res.ok ? await res.json() : []);
                              }}
                              style={{
                                background: "#198754",
                                color: "#fff",
                                border: "none",
                                padding: "4px 12px",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                marginRight: "8px"
                              }}
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => setEditTicketId(null)}
                              style={{
                                background: "#dc3545",
                                color: "#fff",
                                border: "none",
                                padding: "4px 12px",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                cursor: "pointer"
                              }}
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditTicketId(t.id);
                                setEditTitre(t.titre);
                                setEditDesc(t.description || "");
                                setEditAssignee(t.assignee_id);
                              }}
                              style={{
                                background: "#ffc107",
                                color: "#222",
                                border: "none",
                                padding: "4px 12px",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                marginRight: "8px"
                              }}
                            >
                              Modifier
                            </button>
                            <button
                              onClick={async () => {
                                const confirm = window.confirm("Êtes-vous sûr de vouloir supprimer ce ticket ?");
                                if (!confirm) return;
                                await fetch(`/api/tickets/${t.id}`, {
                                  method: "DELETE"
                                });
                                const res = await fetch("/api/tickets");
                                setTickets(res.ok ? await res.json() : []);
                              }}
                              style={{
                                background: "#dc3545",
                                color: "#fff",
                                border: "none",
                                padding: "4px 12px",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                cursor: "pointer"
                              }}
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
          <button
            onClick={() => setShowTicketsPage(false)}
            style={{
              background: "#222",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              marginTop: "16px"
            }}
          >
            Retour
          </button>
        </div>
      )}
      {/* Modal création ticket */}
      {showModal && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1000
          }}
        >
          <div
            style={{
              background: "#fff", padding: "32px", borderRadius: "12px",
              boxShadow: "0 2px 16px rgba(0,0,0,0.15)", minWidth: "350px",
              minHeight: "120px", display: "flex", flexDirection: "column", gap: "16px"
            }}
          >
            <h3 style={{ margin: 0, fontWeight: "bold", color: "#222" }}>Créer un ticket</h3>
            <input
              type="text"
              placeholder="Titre du ticket"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
            <textarea
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
            <select
              value={assignee}
              onChange={(e) => setAssignee(Number(e.target.value))}
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              <option value="">Assigner à...</option>
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.username}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCreate}
                style={{
                  background: "#198754", color: "#fff", border: "none",
                  padding: "8px 16px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer"
                }}
              >
                Créer
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "#dc3545", color: "#fff", border: "none",
                  padding: "8px 16px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer"
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Affichage des statistiques si showStatsPage */}
      {showStatsPage && (
        <div style={{
          background: "#f5f6fa",
          borderRadius: "12px",
          padding: "24px",
          marginTop: "16px"
        }}>
          <h4 style={{ fontWeight: "bold", color: "#222" }}>Statistiques des tickets</h4>
          <BarChart
            width={500}
            height={300}
            data={ticketStats}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
          <button
            onClick={() => {
              setShowStatsPage(false);
              setShowTicketsPage(true);
            }}
            style={{
              background: "#222",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              marginTop: "16px"
            }}
          >
            Retour
          </button>
        </div>
      )}
    </div>
  );
};



export default TicketPage;
