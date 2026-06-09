import { useState } from "react";

export default function CreateTicketModal({
  show,
  onClose,
  onCreate,
  allMembers,
}: any) {

  const [form, setForm] = useState({
    titre: "",
    description: "",
    assignee: ""
  });

  const handleChange = (e: any) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = () => {
    onCreate({
      titre: form.titre,
      description: form.description,
      assignee_id: Number(form.assignee)
    });

    setForm({ titre: "", description: "", assignee: "" });
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal">
      <input name="titre" onChange={handleChange} />
      <textarea name="description" onChange={handleChange} />

      <select name="assignee" onChange={handleChange}>
        {allMembers.map((m: any) => (
          <option key={m.id} value={m.id}>
            {m.username}
          </option>
        ))}
      </select>

      <button onClick={handleSubmit}>Create</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}