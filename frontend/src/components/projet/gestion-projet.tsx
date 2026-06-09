import { useEffect, useState, useRef } from "react";
import "./gestion-projet.css";
import { useKeycloak } from "@react-keycloak/web";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEye, FaDownload, FaArrowLeft } from "react-icons/fa";
import TicketPage from "./Ticket/ticket"; // Correction du chemin et nom
import { PieChart, Pie, Cell } from 'recharts';
import { toast } from "react-toastify";


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
  const [showTickets, setShowTickets] = useState(false);
  const [showFichiers, setShowFichiers] = useState(false);
  const [userQuota, setUserQuota] = useState<{ quota_mb: number; used_mb: number } | null>(null);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch quota for connected user
  async function fetchUserQuota() {
    const keycloakId = user?.id || user?.sub;
    if (!keycloakId) return;

    const userRes = await fetch(`/api/users/by-keycloak/${keycloakId}`);
    if (!userRes.ok) return;

    const userData = await userRes.json();
    setUserId(userData.id);

    const quotaRes = await fetch(`/api/${userData.id}`);
    if (quotaRes.ok) {
      const data = await quotaRes.json();
      setUserQuota(data);
    }
  }

  useEffect(() => {
    const loadQuota = async () => {
      await fetchUserQuota();
    };

    loadQuota();
  }, [user?.id, user?.sub]);


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
        toast.success("Projet créé avec succès 🎉");
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
        toast.success("Projet supprimé avec succès 🎉");
      }
    }
  };

  // Ajoute cette fonction pour la navigation
  const handleProjectClick = (proj: any) => {
    // Redirige vers la page projet.tsx avec l'aside (sidebar)
    navigate(`/projet/${proj.id}`, { state: { projet: proj, group, members } });
  };

  // Fonction d'upload de fichier
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('[FRONT] Fichier sélectionné:', file);
    if (!file || !userId) {
      console.error('[FRONT] Fichier ou userId manquant');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', String(userId));

    console.log('[FRONT] Envoi upload avec user_id:', userId);

    try {
      const res = await fetch('http://localhost:5000/api/files', {
        method: 'POST',
        body: formData
      });
      console.log('[FRONT] Réponse upload:', res.status, res.statusText);
      if (res.ok) {
        const filesRes = await fetch('http://localhost:5000/api/files');
        if (filesRes.ok) {
          const filesList = await filesRes.json();
          setSharedFiles(filesList);
          toast.success("Fichier téléchargé avec succès 🎉");
          console.log('[FRONT] Liste fichiers après upload:', filesList);
        } else {
          console.error('[FRONT] Erreur fetch files après upload:', filesRes.status, await filesRes.text());
        }
        // Rafraîchir le quota après upload
        fetchUserQuota();
      } else {
        const errorText = await res.text();
        console.error('[FRONT] Erreur upload:', errorText);
      }
    } catch (err) {
      console.error('[FRONT] Exception upload:', err);
    }
  };

  const handleImportClick = () => {
    console.log('[FRONT] Bouton Importer un fichier cliqué');
    fileInputRef.current?.click();
  };

  // Charge les fichiers partagés lorsque la section Partage Fichiers est ouverte
  useEffect(() => {
    if (showFichiers) {
      fetch('http://localhost:5000/api/files')
        .then(res => res.ok ? res.json() : [])
        .then(data => setSharedFiles(Array.isArray(data) ? data : []))
        .catch(() => setSharedFiles([]));
    }
  }, [showFichiers]);

  // Fonction de suppression de fichier
  const handleDeleteFile = async (fileId: number) => {
    if (!userId) return;
    await fetch(`http://localhost:5000/api/files/${fileId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    // Rafraîchir la liste et le quota
    const filesRes = await fetch('http://localhost:5000/api/files');
    if (filesRes.ok) {
      setSharedFiles(await filesRes.json());
    }
    fetchUserQuota();
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
            <li
              style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}
              onClick={() => setShowTickets(true)}
            >
              Tickets
            </li>
            <li style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}
              onClick={() => setShowFichiers(true)}
            >Partage Fichiers</li>

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
          {showTickets ? (
            <div style={{ flex: 1, width: "100%" }}>
              <TicketPage
                allMembers={members}
              />
              <button
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
                onClick={() => setShowTickets(false)}
              >
                Retour aux projets
              </button>
            </div>
          ) : showFichiers ? (
            <section style={{ display: 'flex', width: '100%', gap: 32, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 100 }}>
                <button onClick={() => setShowFichiers(false)} style={{ background: 'transparent', border: 'none', borderRadius: 8, padding: 0, cursor: 'pointer' }} title="Fermer">
                  <FaArrowLeft size={32} color="#222" />
                </button>
              </div>
              {/* Left: Quota Dashboard */}
              <div style={{ width: 340, minWidth: 280, background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: 24, height: 'fit-content', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#222', marginBottom: 8, letterSpacing: 1 }}>STOCKAGE</h3>
                <div style={{ fontSize: '1.05rem', color: '#888', marginBottom: 8 }}>{user?.email || user?.preferred_username}</div>
                {userQuota && (
                  <>
                    {(userQuota.used_mb / userQuota.quota_mb) >= 1 && (
                      <div style={{ background: '#dc3545', color: '#fff', padding: 10, borderRadius: 8, marginBottom: 12, fontWeight: 'bold', textAlign: 'center' }}>
                        Vous avez dépassé votre quota de stockage !
                      </div>
                    )}
                    {(userQuota.used_mb / userQuota.quota_mb) >= 0.8 && (userQuota.used_mb / userQuota.quota_mb) < 1 && (
                      <div style={{ background: '#ffc107', color: '#222', padding: 10, borderRadius: 8, marginBottom: 12, fontWeight: 'bold', textAlign: 'center' }}>
                        Attention : vous avez utilisé plus de 80% de votre quota !
                      </div>
                    )}
                    <PieChart width={180} height={180} style={{ margin: '0 auto' }}>
                      <Pie
                        data={[
                          { name: 'Utilisé', value: userQuota.used_mb },
                          { name: 'Libre', value: Math.max(userQuota.quota_mb - userQuota.used_mb, 0) }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell key="used" fill="#198754" />
                        <Cell key="free" fill="#eaf1fb" />
                      </Pie>
                      <text x={90} y={95} textAnchor="middle" dominantBaseline="middle" fontSize="2.1rem" fontWeight="bold" fill="#222">{userQuota.used_mb.toFixed(2)}</text>
                      <text x={90} y={120} textAnchor="middle" fontSize="1rem" fill="#888">/{userQuota.quota_mb} Mo</text>
                    </PieChart>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#198754' }}>{userQuota.used_mb.toFixed(2)} Mo</div>
                        <div style={{ color: '#888', fontSize: '0.95rem' }}>Utilisé</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#2d3a4a' }}>{(userQuota.quota_mb - userQuota.used_mb).toFixed(2)} Mo</div>
                        <div style={{ color: '#888', fontSize: '0.95rem' }}>Libre</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#222' }}>{userQuota.quota_mb} Mo</div>
                        <div style={{ color: '#888', fontSize: '0.95rem' }}>Total</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              {/* Center: File sharing section */}
              <div style={{ flex: 1, background: '#e9e9f1ff', borderRadius: 30, minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontSize: 24, color: '#888', gap: 24, padding: 32 }}>
                <div style={{ fontSize: 22, color: '#222', marginBottom: 16 }}>Partage de fichiers</div>
                {/* Upload */}
                <label style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <button type="button" onClick={handleImportClick} style={{ background: '#000000ff', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>
                    Importer un fichier
                  </button>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                </label>
                {/* Liste des fichiers partagés */}
                <div style={{ width: '1000%', maxWidth: 550, background: '#fff', borderRadius: 12, boxShadow: '4px 8px 12px rgba(0,0,0,0.06)', padding: 30, marginTop: 8 }}>
                  <div style={{ fontWeight: 'bold', color: '#222', marginBottom: 10, fontSize: 18 }}>Fichiers partagés</div>
                  {sharedFiles.length === 0 ? (
                    <div style={{ color: '#888', fontSize: 16 }}>Aucun fichier partagé.</div>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {sharedFiles.map(file => {
                        const fileUrl = `http://localhost:5000${file.file_url}`;
                        const isOwner = userId && file.user_id === userId;
                        return (
                          <li key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ color: '#222', fontWeight: 500 }}>{file.file_name}</span>
                            <span style={{ color: '#888', fontSize: 14 }}>{file.size ? file.size + ' Ko' : ''}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#222', marginRight: 4 }} title="Voir le fichier">
                                <FaEye size={22} />
                              </a>
                              <a href={fileUrl} download style={{ color: '#222', textDecoration: 'none' }} title="Télécharger">
                                <FaDownload size={22} />
                              </a>
                              {isOwner && (
                                <button onClick={() => handleDeleteFile(file.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} title="Supprimer">
                                  <FaTrash size={22} color="#dc3545" />
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <>
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
                    members.map((m: any) => (
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
            </>
          )}
        </section>
      </main >
    </div >
  );
}

export default GestionProjet;
