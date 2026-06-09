import type { Ticket } from "./ticket";

export interface TicketListProps {
    tickets: Ticket[];
    etatOptions: string[];
    currentUserId: number | null;

    onEtatChange: (ticket: Ticket, newEtat: string) => void;
    onEdit: (ticket: Ticket) => void;
    onDelete: (id: number) => void;
}