import type { Ticket } from "../../../types/ticket";

type Props = {
    ticket: Ticket;
    etatOptions: string[];
    currentUserId: number;
    onEtatChange: (ticket: Ticket, etat: string) => void;
    onEdit: (ticket: Ticket) => void;
    onDelete: (id: number) => void;
};

const TicketItem: React.FC<Props> = ({
    ticket,
    etatOptions,
    currentUserId,
    onEtatChange,
    onEdit,
    onDelete
}) => {

    const canUpdateData =
        Number(currentUserId) === Number(ticket.created_by);

    const canUpdateState =
        Number(currentUserId) === Number(ticket.assignee_id);

    const isAssignedToCurrentUser =
        Number(currentUserId) === Number(ticket.assignee_id);

    const getEtatColor = () => {
        switch (ticket.etat.toLowerCase()) {
            case "nouveau":
                return "#0d6efd";

            case "en cours":
                return "#fd7e14";

            case "resolu":
                return "#198754";

            case "ferme":
                return "#6c757d";

            default:
                return "#343a40";
        }
    };

    return (
        <li
            style={{
                background: isAssignedToCurrentUser
                    ? "linear-gradient(135deg, #e8fff1, #d8f7e4)"
                    : "#ffffff",

                border: isAssignedToCurrentUser
                    ? "1px solid #b7ebc6"
                    : "1px solid #ececec",

                borderRadius: "16px",

                padding: "18px 20px",

                marginBottom: "16px",

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                boxShadow: "0 4px 14px rgba(0,0,0,0.05)",

                transition: "0.2s ease",

                gap: "20px"
            }}
        >

            {/* LEFT SIDE */}
            <div style={{ flex: 1 }}>

                {/* TOP */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap"
                    }}
                >

                    {/* ETAT */}
                    {canUpdateState ? (
                        <select
                            value={ticket.etat}
                            onChange={(e) =>
                                onEtatChange(ticket, e.target.value)
                            }
                            style={{
                                padding: "6px 10px",
                                borderRadius: "8px",
                                border: "1px solid #dcdcdc",
                                fontWeight: 600,
                                cursor: "pointer",
                                background: "#fff"
                            }}
                        >
                            {etatOptions.map((etat) => (
                                <option key={etat} value={etat}>
                                    {etat}
                                </option>
                            ))}
                        </select>) : (
                        <span
                            style={{
                                background: getEtatColor(),

                                color: "#fff",

                                padding: "6px 12px",

                                borderRadius: "999px",

                                fontSize: "0.85rem",

                                fontWeight: 700,

                                textTransform: "capitalize"
                            }}
                        >
                            {ticket.etat}
                        </span>
                    )}

                    {/* TITLE */}
                    <span
                        style={{
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "#212529"
                        }}
                    >
                        {ticket.titre}
                    </span>
                </div>

                {/* DESCRIPTION */}
                {ticket.description && (
                    <p
                        style={{
                            marginTop: "10px",
                            marginBottom: "10px",
                            color: "#5c5c5c",
                            lineHeight: 1.5
                        }}
                    >
                        {ticket.description}
                    </p>
                )}

                {/* INFOS */}
                <div
                    style={{
                        display: "flex",
                        gap: "18px",
                        flexWrap: "wrap",
                        fontSize: "0.92rem",
                        color: "#6c757d"
                    }}
                >
                    <span>
                        👤 Assigné à :
                        <strong style={{ color: "#212529", marginLeft: 4 }}>
                            {ticket.assignee?.username || ticket.assignee_id}
                        </strong>
                    </span>

                    <span>
                        🛠 Créé par :
                        <strong style={{ color: "#212529", marginLeft: 4 }}>
                            {ticket.creator?.username || ticket.created_by}
                        </strong>
                    </span>
                </div>
            </div>

            {/* RIGHT SIDE */}
            {canUpdateData && (
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center"
                    }}
                >
                    <button
                        onClick={() => onEdit(ticket)}
                        style={{
                            background: "#fff3cd",
                            color: "#856404",
                            border: "1px solid #ffe69c",
                            padding: "9px 14px",
                            borderRadius: "10px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "0.2s"
                        }}
                    >
                        ✏ Modifier
                    </button>
                    <button
                        onClick={() => onDelete(ticket.id)}
                        style={{
                            background: "#f8d7da",

                            color: "#842029",

                            border: "1px solid #f1aeb5",

                            padding: "9px 14px",

                            borderRadius: "10px",

                            fontWeight: 700,

                            cursor: "pointer",

                            transition: "0.2s"
                        }}
                    >
                        🗑 Supprimer
                    </button>
                </div>
            )}
        </li>
    );
};

export default TicketItem;