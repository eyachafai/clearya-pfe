import { useEffect, useState } from "react";
import { Ticket } from "../../../types/ticket";
import { Member } from "../../../types/membre";
import { useKeycloak } from '@react-keycloak/web';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useCurrentUserId } from "../../../hooks/useCurrentUserId";
import { socket } from "../../../socket";
import TicketList from "./TicketList";
import "./ticket.css";
import { toast } from "react-toastify";




const TicketPage = ({ allMembers }: {
  allMembers: Member[];
  //projetId?: number;
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
  const [showStatsPage, setShowStatsPage] = useState(false);
  const [editTicketId, setEditTicketId] = useState<number | null>(null);
  const [editTitre, setEditTitre] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAssignee, setEditAssignee] = useState<number | "">("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<number | null>(null);


  console.log('Props received:', { allMembers });
  console.log('Keycloak tokenParsed:', keycloak?.tokenParsed);
  console.log('Detailed Keycloak tokenParsed:', keycloak?.tokenParsed);
  const roles = [
    ...(keycloak?.tokenParsed?.realm_access?.roles || []),
    ...(keycloak?.tokenParsed?.resource_access?.myapp?.roles || [])
  ];

  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager");

  const canCreateTicket = isAdmin || isManager;
  const currentUserId = useCurrentUserId();

  useEffect(() => {

    if (isAdmin) {

      fetch("http://localhost:5000/api/admin/utilisateurs")
        .then(res => res.json())
        .then(data => {
          setMembers(data);
        })
        .catch(err => console.error(err));

    } else if (isManager) {

      setMembers(allMembers);

    }

  }, [isAdmin, isManager, allMembers]);

  useEffect(() => {

    setEtatOptions(["nouveau", "en cours", "resolu", "ferme"]);

    let url = "http://localhost:5000/api/tickets";

    // employee يشوف كان tickets متاعو
    if (!isAdmin && !isManager && currentUserId) {
      url += `?assignee_id=${currentUserId}`;
    }

    const params: string[] = [];

    if (filterEtat) {
      params.push(`etat=${encodeURIComponent(filterEtat)}`);
    }

    // admin/manager ينجم يفلتر بال assignee
    if ((isAdmin || isManager) && filterAssignee) {
      params.push(`assignee_id=${filterAssignee}`);
    }

    if (params.length) {
      url += (url.includes("?") ? "&" : "?") + params.join("&");
    }

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTickets(data);
        } else {
          setTickets([]);
        }
      })
      .catch(err => {
        console.error(err);
        setTickets([]);
      });

  }, [
    filterEtat,
    filterAssignee,
    showModal,
    currentUserId,
    isAdmin,
    isManager
  ]);

  // Créer un ticket (manager et admin uniquement)
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
        toast.error('Erreur création ticket: ' + (err?.error || res.statusText));
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
      toast.success("Ticket créé avec succès 🎉");
    } catch (err) {
      console.error('Erreur handleCreate ticket:', err);
      toast.error('Erreur création ticket');
    }
  };


  const handleEdit = (ticket: Ticket) => {
    setEditTicketId(ticket.id);
    setEditTitre(ticket.titre);
    setEditDesc(ticket.description || "");
    setEditAssignee(ticket.assignee_id);
    setShowEditModal(true);
  };


  const handleDeleteClick = (id: number) => {
    setTicketToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;

    await fetch(`/api/tickets/${ticketToDelete}`, { method: "DELETE" });

    const res = await fetch("/api/tickets");
    setTickets(res.ok ? await res.json() : []);

    toast.success("Ticket supprimé avec succès 🎉");

    setShowDeleteModal(false);
    setTicketToDelete(null);
  };


  const handleEtatChange = async (ticket: Ticket, newEtat: string) => {
    if (!etatOptions.includes(newEtat)) return;
    try {
      console.log('[FRONT] PATCH ticket etat:', { ticketId: ticket.id, newEtat, currentUserId });
      const response = await fetch(`/api/tickets/${ticket.id}/etat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etat: newEtat, utilisateur_id: currentUserId }),
      });
      const result = await response.json();
      console.log('[FRONT] PATCH ticket etat response:', result);
      // Re-authenticate socket to ensure notifications
      if (localStorage.getItem('utilisateur_id')) {
        socket.emit('authenticate', { userId: localStorage.getItem('utilisateur_id') });
      }
      // Optimistic update
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, etat: newEtat } : t))
      );
    } catch (err) {
      console.error('[FRONT] Erreur mise à jour état du ticket:', err);
      toast.error('Erreur lors de la mise à jour de l\'état du ticket');
    }
  };


  const handleUpdate = async () => {
    if (!editTicketId) return;

    await fetch(`/api/tickets/${editTicketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: editTitre,
        description: editDesc,
        assignee_id: editAssignee,
      }),
    });

    const res = await fetch("/api/tickets");
    setTickets(res.ok ? await res.json() : []);
    toast.success("Mise à jour du ticket réussie 🎉");


    setShowEditModal(false);
    setEditTicketId(null);
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

        {canCreateTicket && (<button
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
      {canCreateTicket && (
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
            {members.map((m) => (
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
            <h4 style={{ fontWeight: "bold", color: "#222" }}>Tous les tickets </h4>
            {canCreateTicket && (
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
                onClick={() => setShowModal(true)}
              >
                + Créer un ticket
              </button>
            )}          </div>
          <ul style={{ marginTop: "16px", width: "100%" }}>
            {tickets.length === 0 ? (
              <li>Aucun ticket .</li>
            ) : (
              <TicketList
                tickets={tickets}
                etatOptions={etatOptions}
                currentUserId={currentUserId}
                onEtatChange={handleEtatChange}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
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
        <div className="modal-overlay">
          <div className="modal-card">

            <h2 className="modal-title">🎫 Créer un ticket</h2>

            <div className="modal-body">

              <label>Titre</label>
              <input
                type="text"
                placeholder="Titre du ticket"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="input"
              />

              <label>Description</label>
              <textarea
                placeholder="Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="textarea"
              />

              <label>Assigné à</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(Number(e.target.value))}
                className="input"
              >
                <option value="">Choisir un membre</option>

                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.username}
                  </option>
                ))}
              </select>

            </div>

            <div className="modal-actions">
              <button
                className="btn-save"
                onClick={handleCreate}
              >
                Créer
              </button>

              <button
                className="btn-cancel"
                onClick={() => setShowModal(false)}
              >
                Annuler
              </button>
            </div>

          </div>
        </div>
      )}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-card">

            <h2 className="modal-title">✏️ Modifier le ticket</h2>

            <div className="modal-body">

              <label>Titre</label>
              <input
                value={editTitre}
                onChange={(e) => setEditTitre(e.target.value)}
                className="input"
                placeholder="Titre du ticket"
              />

              <label>Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="textarea"
                placeholder="Description"
              />

              <label>Assigné à</label>
              <select
                value={editAssignee}
                onChange={(e) => setEditAssignee(Number(e.target.value))}
                className="input"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.username}
                  </option>
                ))}
              </select>

            </div>

            <div className="modal-actions">
              <button className="btn-save" onClick={handleUpdate}>
                Enregistrer
              </button>

              <button
                className="btn-cancel"
                onClick={() => setShowEditModal(false)}
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
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-card">

            <h3 style={{ marginBottom: "10px" }}>
              ⚠ Confirmation
            </h3>

            <p>Êtes-vous sûr de vouloir supprimer ce ticket ?</p>

            <div className="modal-actions">
              <button
                className="btn-save"
                style={{ background: "#dc3545" }}
                onClick={confirmDelete}
              >
                Oui, supprimer
              </button>

              <button
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};



export default TicketPage;