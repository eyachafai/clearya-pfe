import { useEffect, useState } from "react";
import { Ticket } from "../../types/ticket";

const TicketPageAdmin = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    // Fetch all tickets from the backend API
    fetch("/api/tickets")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTickets(data);
        } else {
          setTickets([]);
        }
      })
      .catch(() => {
        setTickets([]);
      });
  }, []);

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 32, minHeight: 340 }}>
      <h2 style={{ fontWeight: "bold", color: "#222" }}>Historique des tickets</h2>
      <ul style={{ marginTop: "16px", width: "100%" }}>
        {tickets.length === 0 ? (
          <li>Aucun ticket trouvé.</li>
        ) : (
          tickets.map((ticket) => (
            <li
              key={ticket.id}
              style={{
                background: "#f5f6fa",
                borderRadius: "8px",
                padding: "12px 18px",
                marginBottom: "10px",
                fontWeight: "bold",
                color: "#222",
                display: "flex",
                alignItems: "center",
              }}
            >
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
                  {ticket.etat}
                </span>
                {ticket.titre} — {ticket.description}
                <br />
                <span style={{ fontWeight: "normal", fontSize: "1rem" }}>
                  Assigné à : {ticket.assignee?.username || ticket.assignee_id}
                </span>
                <span style={{ fontWeight: "normal", fontSize: "1rem", marginLeft: 12 }}>
                  Créé par : {ticket.creator?.username || ticket.created_by}
                </span>
                {ticket.resolved_at && (
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
                    Résolu le {new Date(ticket.resolved_at).toLocaleString()}
                  </span>
                )}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default TicketPageAdmin;