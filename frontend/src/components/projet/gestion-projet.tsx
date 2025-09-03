import { useEffect, useState } from "react";
import "./gestion-projet.css";
import { useKeycloak } from "@react-keycloak/web";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa"; // Ajoute cette ligne en haut

const GestionProjet = () => {
  const { keycloak } = useKeycloak();
  const user = keycloak.tokenParsed;
  const [group, setGroup] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const navigate = useNavigate();

  // Récupère le groupe principal de l'utilisateur (hors "employee")
  useEffect(() => {
    // Log complet pour voir la structure du user
    console.log("[FRONT] user:", user);

    // Vérifie si user.id existe vraiment
    if (!user?.id) {
      console.warn("[FRONT] user.id n'existe pas, essaye user.sub:", user?.sub);
    }

    async function fetchGroupAndData() {
      setLoading(true);
      try {
        // Utilise user.sub comme identifiant si user.id n'existe pas
        const userId = user?.id || user?.sub;
        console.log("[FRONT] Appel API /api/groupes-utilisateur/", userId);

        const res = await fetch(`/api/groupes-utilisateur/${userId}`);
        const groupes = await res.json();
        console.log("[FRONT] Réponse groupes-utilisateur:", groupes);

        // Ajoute une vérification si la réponse est une erreur
        if (groupes.error) {
          console.error("[FRONT] Erreur backend:", groupes.details);
          setGroup(null);
          setProjects([]);
          setMembers([]);
          setLoading(false);
          return;
        }

        const mainGroup = Array.isArray(groupes)
          ? groupes.find((g: any) => g.name.toLowerCase() !== "employee")
          : null;
        setGroup(mainGroup);

        if (!mainGroup) {
          setProjects([]);
          setMembers([]);
          setLoading(false);
          return;
        }

        const projectsRes = await fetch(`/api/projets?groupe_id=${mainGroup.id}`);
        // Ajoute un log pour le status de la réponse
        console.log("[FRONT] Status projets:", projectsRes.status);
        if (!projectsRes.ok) {
          console.error("[FRONT] Erreur API projets:", projectsRes.status, await projectsRes.text());
          setProjects([]);
          // Tu peux continuer ou return selon ton besoin
          // return;
        } else {
          const projectsData = await projectsRes.json();
          console.log("[FRONT] Réponse projets:", projectsData);
          setProjects(projectsData);
        }

        const membersRes = await fetch(`/api/groupes/${mainGroup.id}/members`);
        const membersData = await membersRes.json();
        console.log("[FRONT] Réponse membres:", membersData);
        setMembers(membersData);
      } catch (err) {
        console.error("[FRONT] Erreur fetchGroupAndData:", err);
        setGroup(null);
        setProjects([]);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }
    // Utilise user.sub si user.id n'existe pas
    if (user?.id || user?.sub) fetchGroupAndData();
  }, [user?.id, user?.sub]);

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
    // Refresh projects après ajout
    try {
      const projectsRes = await fetch(`/api/projets?groupe_id=${group.id}`);
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
    } catch (err) {
      // Optionnel: log erreur
      console.error("[FRONT] Erreur refresh projets après ajout:", err);
    }
  };

  // Fonction de suppression
  const handleDeleteProject = async (id: number) => {
    await fetch(`/api/projets/${id}`, { method: "DELETE" });
    setDeleteProjectId(null);
    // Refresh projects après suppression
    if (group) {
      const projectsRes = await fetch(`/api/projets?groupe_id=${group.id}`);
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
    }
  };

  // Ajoute cette fonction pour la navigation
  const handleProjectClick = (proj: any) => {
    // Redirige vers la page projet.tsx avec l'aside (sidebar)
    navigate(`/projet/${proj.id}`, { state: { projet: proj, group, members } });
  };

  return (
    <div className="dashboard-wrapper" style={{ background: "#f5f6fa", minHeight: "100vh" }}>
      <aside className="sidebar" style={{
        background: "#222",
        color: "#fff",
        width: "220px",
        minHeight: "100vh",
        padding: "32px 0 0 0",
        boxShadow: "2px 0 16px rgba(0,0,0,0.04)"
      }}>
        <div className="logo" style={{
          fontWeight: "bold",
          fontSize: "1.5rem",
          marginBottom: "32px",
          textAlign: "center",
          letterSpacing: "2px"
        }}>CLEARYA</div>
        <nav>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li className="active" style={{
              background: "#333",
              borderRadius: "8px",
              margin: "8px 16px",
              padding: "12px 20px",
              fontWeight: "bold"
            }}>Projets</li>
            <li style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>Tickets</li>
            <li style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>Partage Fichiers</li>
            <li style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>Équipes</li>
          </ul>
        </nav>
      </aside>
      <main className="dashboard-main" style={{ marginLeft: "220px", padding: "32px" }}>
        <header className="dashboard-header" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px"
        }}>
          <h2 style={{ fontWeight: "bold", fontSize: "2rem", color: "#222" }}>
            Gestion des projets - {group?.name || "Chargement..."}
          </h2>
          <div className="user-info" style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "8px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <span style={{ fontWeight: "bold", color: "#222" }}>{user?.preferred_username}</span>
            <span className="role" style={{
              background: "#222",
              color: "#fff",
              borderRadius: "6px",
              padding: "4px 12px",
              fontWeight: "bold",
              fontSize: "0.95rem"
            }}>{group?.role || "Membre"}</span>
          </div>
        </header>
        <section className="dashboard-content" style={{ display: "flex", gap: "32px" }}>
          <div className="projects-section" style={{
            flex: 2,
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            padding: "32px",
            minHeight: "340px"
          }}>
            <div className="section-header" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "24px"
            }}>
              <h3 style={{ fontWeight: "bold", fontSize: "1.2rem", color: "#222" }}>Projets du groupe</h3>
              {group?.role &&
                group.role.toLowerCase().includes("manager") && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="btn-create"
                    style={{
                      background: "#222",
                      color: "#fff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: "1rem"
                    }}
                  >
                    + Créer un projet
                  </button>
                )
              }
            </div>
            {/* Modal centré pour création projet */}
            {showCreate && (
              <div
                className="modal-overlay"
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  background: "rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000
                }}
                onClick={() => setShowCreate(false)}
              >
                <div
                  className="modal-content"
                  style={{
                    background: "#fff",
                    padding: "32px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
                    minWidth: "350px",
                    minHeight: "120px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px"
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <h4 style={{ margin: 0, fontWeight: "bold", color: "#222" }}>Créer un projet</h4>
                  <input
                    type="text"
                    placeholder="Nom du projet"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc"
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleCreateProject}
                      style={{
                        background: "#198754",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Créer
                    </button>
                    <button
                      onClick={() => setShowCreate(false)}
                      style={{
                        background: "#dc3545",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
            <ul className="projects-list" style={{ marginTop: "16px" }}>
              {!group ? (
                <li>Chargement...</li>
              ) : loading ? (
                <li>Chargement...</li>
              ) : projects.length === 0 ? (
                <li>Aucun projet dans ce groupe.</li>
              ) : (
                projects.map(proj => (
                  <li
                    key={proj.id}
                    className="project-item"
                    style={{
                      background: "#222",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "18px 24px",
                      marginBottom: "12px",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <span onClick={() => handleProjectClick(proj)} style={{ flex: 1 }}>
                      {proj.name}
                    </span>
                    {group?.role && group.role.toLowerCase().includes("manager") && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteProjectId(proj.id);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          marginLeft: "16px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center"
                        }}
                        title="Supprimer le projet"
                      >
                        <FaTrash color="#fff" size={18} />
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
            {/* Modal de confirmation suppression */}
            {deleteProjectId !== null && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  background: "rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000
                }}
                onClick={() => setDeleteProjectId(null)}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: "32px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
                    minWidth: "350px",
                    minHeight: "120px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px"
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <h4 style={{ margin: 0, fontWeight: "bold", color: "#222" }}>Confirmer la suppression</h4>
                  <div>Voulez-vous vraiment supprimer ce projet ?</div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => handleDeleteProject(deleteProjectId)}
                      style={{
                        background: "#dc3545",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Oui, supprimer
                    </button>
                    <button
                      onClick={() => setDeleteProjectId(null)}
                      style={{
                        background: "#222",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="members-section" style={{
            flex: 1,
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            padding: "32px",
            minHeight: "340px"
          }}>
            <h3 style={{ fontWeight: "bold", fontSize: "1.2rem", color: "#222", marginBottom: "24px" }}>Membres du groupe</h3>
            <ul className="members-list">
              {!group ? (
                <li>Chargement...</li>
              ) : loading ? (
                <li>Chargement...</li>
              ) : members.length === 0 ? (
                <li>Aucun membre dans ce groupe.</li>
              ) : (
                members.map(m => (
                  <li key={m.id} style={{
                    background: "#f5f6fa",
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
                      {m.username}
                      {m.name && ` (${m.name})`}
                      {m.email && ` - ${m.email}`}
                    </span>
                    <span className="role" style={{
                      background: "#222",
                      color: "#fff",
                      borderRadius: "6px",
                      padding: "4px 12px",
                      fontWeight: "bold",
                      fontSize: "0.95rem"
                    }}>{m.role}</span>
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
