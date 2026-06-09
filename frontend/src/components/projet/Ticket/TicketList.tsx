import React from "react";
import TicketItem from "./TicketItem";
import type { Ticket } from "../../../types/ticket";
import type { TicketListProps } from "../../../types/TicketListProps";


const TicketList: React.FC<TicketListProps> = ({
    tickets,
    etatOptions,
    currentUserId,
    onEtatChange,
    onEdit,
    onDelete,
}) => {
    return (
        <ul>
            {!tickets || tickets.length === 0 ? (
                <li>Aucun ticket.</li>
            ) : (
                tickets.map((t: Ticket) => (
                    <TicketItem
                        key={t.id}
                        ticket={t}
                        etatOptions={etatOptions}
                        currentUserId={Number(currentUserId)}
                        onEtatChange={onEtatChange}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />))
            )}
        </ul>
    );
};

export default TicketList;