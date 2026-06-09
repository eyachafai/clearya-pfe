import { useEffect, useState } from "react";
import type { Ticket } from "../../../types/ticket";
import type { Member } from "../../../types/membre";

type Props = {
  show: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onUpdate: (data: {
    titre: string;
    description: string;
    assignee: number | "";
  }) => Promise<void>;
  allMembers: Member[];
};

export default function EditTicketModal({
  ticket,
  onClose,
  onSave,
  allMembers
}: any) {

  const [form, setForm] = useState({
    titre: "",
    description: "",
    assignee_id: ""
  });

  // sync when ticket changes
  useEffect(() => {
    if (ticket) {
      setForm({
        titre: ticket.titre,
        description: ticket.description,
        assignee_id: ticket.assignee_id
      });
    }
  }, [ticket]);

  const handleChange = (e: any) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = () => {
    onSave(form);
  };

  if (!ticket) return null;

  return (
    <div className="modal-right">

      <input
        name="titre"
        value={form.titre}
        onChange={handleChange}
      />

      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
      />

      <select
        name="assignee_id"
        value={form.assignee_id}
        onChange={handleChange}
      >
        {allMembers.map((m: any) => (
          <option key={m.id} value={m.id}>
            {m.username}
          </option>
        ))}
      </select>

      <button onClick={handleSubmit}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}