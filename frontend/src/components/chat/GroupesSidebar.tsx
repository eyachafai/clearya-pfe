import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Groupe = {
  id: number;
  name: string;
};

type Props = {
  utilisateur_id: number;
};

const GroupesSidebar = ({ utilisateur_id }: Props) => {
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Correction : assure que utilisateur_id est bien un nombre
    if (!utilisateur_id) return;
    const fetchGroupes = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/groupes-utilisateur/${utilisateur_id}`);
        const data = await res.json();
        // Debug : affiche la réponse dans la console
        console.log("Groupes reçus pour utilisateur", utilisateur_id, data);
        // Correction : vérifie que data est bien un tableau et que chaque groupe a un id et un name
        if (Array.isArray(data) && data.length > 0) {
          setGroupes(
            data
              .filter((g: any) => g && g.id && g.name)
              .map((g: any) => ({ id: Number(g.id), name: String(g.name) }))
          );
        } else {
          setGroupes([]);
        }
      } catch (err) {
        console.error("Erreur fetch groupes-utilisateur :", err);
        setGroupes([]);
      }
    };
    fetchGroupes();
  }, [utilisateur_id]);

  return (
    <div className="sidebar">
      <h2>Mes groupes</h2>
      <ul>
        {groupes.length === 0 ? (
          <li style={{ color: "#888" }}>Aucun groupe trouvé.</li>
        ) : (
          groupes.map(g => (
            <li key={g.id} onClick={() => navigate(`/chat?groupe_id=${g.id}`)}>
              {g.name}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default GroupesSidebar;
