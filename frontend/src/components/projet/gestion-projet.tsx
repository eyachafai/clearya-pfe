import { useEffect, useState } from "react";
import "./gestion-projet.css";
import { useKeycloak } from "@react-keycloak/web";
import { useNavigate } from "react-router-dom";

const GestionProjet = () => {
  const { keycloak } = useKeycloak();
  const user = keycloak.tokenParsed;
  const [group, setGroup] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Récupère le groupe principal de l'utilisateur (hors "employee")
  useEffect(() => {
    async function fetchGroupAndData() {
      setLoading(true);
      try {
        // 1. Récupère tous les groupes de l'utilisateur
        const res = await fetch(`/api/admin/groupes-utilisateur/${user?.id}`);
        const groupes = await res.json();
        // Filtre pour exclure le groupe "employee"
        const mainGroup = groupes.find((g: any) => g.name.toLowerCase() !== "employee");
        setGroup(mainGroup);

        if (!mainGroup) {
          setProjects([]);
          setMembers([]);
          setLoading(false);
          return;
        }

        // 2. Récupère les projets du groupe
        const projectsRes = await fetch(`/api/projets?groupe_id=${mainGroup.id}`);
        const projectsData = await projectsRes.json();
        setProjects(projectsData);

        // 3. Récupère les membres du groupe
        const membersRes = await fetch(`/api/groupes/${mainGroup.id}/members`);
        const membersData = await membersRes.json();
        setMembers(membersData);
      } catch (err) {
        setGroup(null);
        setProjects([]);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }
    if (user?.id) fetchGroupAndData();
  }, [user?.id]);

  // Check if user is manager dans ce groupe
  const isManager = group?.role === "manager";

  // Handle project creation
  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !group) return;
    await fetch("/api/projets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName, groupe_id: group.id }),
    });
    setShowCreate(false);
    setNewProjectName("");
    // Refresh projects
    // ...fetch projects again...
  };

  return (
    <div className="dashboard-wrapper">
      <aside className="sidebar">
        <div className="logo">LOGO</div>
        <nav>
          <ul>
            <li className="active">Projets</li>
            <li>Planning</li>
            <li>Utilisateurs</li>
            <li>Équipes</li>
          </ul>
        </nav>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h2>
            Gestion des projets - {group?.name || "Chargement..."}
          </h2>
          <div className="user-info">
            <span>{user?.preferred_username}</span>
            <span className="role">{group?.role === "manager" ? "Manager" : "Membre"}</span>
          </div>
        </header>
        <section className="dashboard-content">
          <div className="projects-section">
            <div className="section-header">
              <h3>Projets du groupe</h3>
              {group?.role === "manager" && (
                <button onClick={() => setShowCreate(true)} className="btn-create">
                  + Créer un projet
                </button>
              )}
            </div>
            {showCreate && (
              <div className="create-project-modal">
                <input
                  type="text"
                  placeholder="Nom du projet"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                />
                <button onClick={handleCreateProject}>Créer</button>
                <button onClick={() => setShowCreate(false)}>Annuler</button>
              </div>
            )}
            <ul className="projects-list">
              {!group ? (
                <li>Chargement...</li>
              ) : loading ? (
                <li>Chargement...</li>
              ) : projects.length === 0 ? (
                <li>Aucun projet dans ce groupe.</li>
              ) : (
                projects.map(proj => (
                  <li key={proj.id} className="project-item">
                    <span>{proj.name}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="members-section">
            <h3>Membres du groupe</h3>
            <ul className="members-list">
              {!group ? (
                <li>Chargement...</li>
              ) : loading ? (
                <li>Chargement...</li>
              ) : members.length === 0 ? (
                <li>Aucun membre dans ce groupe.</li>
              ) : (
                members.map(m => (
                  <li key={m.id}>
                    <span>{m.username || m.name}</span>
                    <span className="role">{m.role}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default GestionProjet;
