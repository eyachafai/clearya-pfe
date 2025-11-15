import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Member } from "../../types/membre";
import { Tache } from "../../types/taches";


const Projet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const projet = location.state?.projet;
  const group = location.state?.group;
  const allMembers: Member[] = location.state?.members || [];
  const [projetMembers, setProjetMembers] = useState<Member[]>([]);
  const [showEquipe, setShowEquipe] = useState(false);
  const [selectedRole, setSelectedRole] = useState<{ [key: number]: string }>({});
  const [taches, setTaches] = useState<Tache[]>([]);
  const [showTacheModal, setShowTacheModal] = useState(false);
  const [tacheTitre, setTacheTitre] = useState("");
  const [tacheDesc, setTacheDesc] = useState("");
  const [tacheMembre, setTacheMembre] = useState<number | "">("");

  const [showTachesPage, setShowTachesPage] = useState(false);
  const [editTacheId, setEditTacheId] = useState<number | null>(null);
  const [editTitre, setEditTitre] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMembre, setEditMembre] = useState<number | "">("");

  const etatOptions = ["a faire", "en cours", "terminee"];

  const [etatSelectTacheId, setEtatSelectTacheId] = useState<number | null>(null);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);


  useEffect(() => {

    // Redirige si pas de projet (ex: refresh direct sur l'URL)
    if (!projet) {
      navigate("/projets");
    }

    // Récupère les membres du projet
    async function fetchProjetMembers() {
      if (!projet) return;
      try {
        const res = await fetch(`/api/projet/${projet.id}/membres`);
        if (res.ok) {
          setProjetMembers(await res.json());
        } else {
          setProjetMembers([]);
        }
      } catch {
        setProjetMembers([]);
      }
    }
    fetchProjetMembers();

    // Récupère les taches du projet
    async function fetchTaches() {
      if (!projet) return;
      try {
        const res = await fetch(`/api/projet/${projet.id}/taches`);
        if (res.ok) {
          setTaches(await res.json());
        } else {
          setTaches([]);
        }
      } catch {
        setTaches([]);
      }
    }
    fetchTaches();

    // Charger la liste des états depuis le backend
    async function fetchEtats() {
      try {
        const res = await fetch("/api/taches/etats");
        //  console.log('res ', res)
        if (res.ok) {
          //    setEtatOptions(await res.json());
        } else {
          //     setEtatOptions(["à faire", "en cours", "terminée"]);
        }
      } catch {
        //  setEtatOptions(["à faire", "en cours", "terminée"]);
      }
    }
    fetchEtats();

    // Récupère le keycloak_id (sub) du user connecté
    let keycloakId = localStorage.getItem("keycloak_id") || localStorage.getItem("sub");
    // Mappe sur les membres du projet pour trouver l'id interne
    const membre = projetMembers.find((m: any) => m.keycloak_id === keycloakId);
    if (membre) {
      setCurrentUserId(membre.id); // id interne de la BD
    } else {
      setCurrentUserId(null);
    }

  }, [projet, navigate, projetMembers]);



  // Vérifie si user est manager (optionnel, à adapter selon ton besoin)
  // const isManager = ...;
  const isManager = group?.role && group.role.toLowerCase().includes("manager");

  if (!projet) return null; // évite le rendu blanc sans rien

  // Ajout d'une tâche (manager uniquement)
  const handleCreateTache = async () => {
    if (!tacheTitre.trim() || !tacheMembre) return;
    await fetch(`/api/projet/${projet.id}/taches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: tacheTitre,
        description: tacheDesc,
        membre_id: tacheMembre
      }),
    });
    setShowTacheModal(false);
    setTacheTitre("");
    setTacheDesc("");
    setTacheMembre("");
    // Refresh
    const res = await fetch(`/api/projet/${projet.id}/taches`);
    setTaches(res.ok ? await res.json() : []);
  };

  // Ajoute la gestion du changement d'état d'une tâche
  const handleEtatChange = async (tacheId: number, newEtat: string) => {
    // Utilise la nouvelle route PATCH et passe l'utilisateur connecté
    const r = await fetch(`/api/projet/${projet.id}/taches/${tacheId}/etat`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etat: newEtat, utilisateur_id: currentUserId }),
    });
    if (r.ok) {
      const updated = await r.json();
      setTaches(prev => prev.map(x => x.id === tacheId ? updated : x));
    } else {
      const err = await r.json().catch(() => ({}));
      alert(err?.error || "Erreur changement état");
    }
  };

  // DEBUG: force la présence du keycloak_id dans le localStorage si tu connais la valeur
  if (!localStorage.getItem("keycloak_id") && projetMembers.length > 0) {
    // Prend le keycloak_id du premier membre pour debug (à adapter selon ton besoin)
    localStorage.setItem("keycloak_id", (projetMembers[0] as any).keycloak_id || "");
    console.log("DEBUG: keycloak_id ajouté au localStorage:", (projetMembers[0] as any).keycloak_id);
  }

  const isCurrentUserTacheOwner = (t: Tache) => {
    console.log('currentUserId ', currentUserId)
    console.log('membre_id ', t.membre_id)

    return currentUserId !== null && Number(t.membre_id) === Number(currentUserId);
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
            }}>{projet?.name || "Projet"}</li>
            <li style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>Planning</li>
            <li style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>Utilisateurs</li>
            <li
              style={{
                margin: "8px 16px",
                padding: "12px 20px",
                borderRadius: "8px",
                cursor: "pointer"
              }}
              onClick={() => setShowEquipe(true)}
            >
              Équipes
            </li>
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
            Projet : {projet?.name}
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
            <span style={{ fontWeight: "bold", color: "#222" }}>{group?.name}</span>
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
          <div className="project-section" style={{
            flex: 2,
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            padding: "32px",
            minHeight: "340px"
          }}>
            <div style={{ fontWeight: "normal", fontSize: "1.1rem", color: "#444", marginBottom: "32px" }}>
              application de communication intra-entreprise
            </div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
              {/* <button
                style={{
                  background: "#222",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "1rem"
                }}
                onClick={() => setShowEquipe(true)}
              >
                Gérer l'équipe
              </button> */}
              <button
                style={{
                  background: "#222",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "1rem"
                }}
                onClick={() => {
                  setShowTachesPage(true);
                  setEditTacheId(null);
                }}
              >
                Voir les tâches
              </button>
            </div>
            {/* Affichage des tâches à droite si showTachesPage */}
            {showTachesPage && (
              <div style={{
                background: "#f5f6fa",
                borderRadius: "12px",
                padding: "24px",
                marginTop: "16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontWeight: "bold", color: "#222" }}>Toutes les tâches du projet</h4>
                  {isManager && (
                    <button
                      style={{
                        background: "#222",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                      onClick={() => {
                        setEditTacheId(null);
                        setEditTitre("");
                        setEditDesc("");
                        setEditMembre("");
                        setShowTacheModal(true);
                      }}
                    >
                      + Créer une tâche
                    </button>
                  )}
                </div>
                <ul style={{ marginTop: "16px", width: "100%" }}>
                  {taches.length === 0 ? (
                    <li>Aucune tâche pour ce projet.</li>
                  ) : (
                    taches.map(t => {
                      const canUpdate = isCurrentUserTacheOwner(t);
                      return (
                        <li key={t.id} style={{
                          background: canUpdate ? "#e0ffe0" : "#f5f6fa",
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
                            {/* Affiche le badge ou le select selon l'état */}
                            {canUpdate ? (
                              <select
                                value={t.etat || "à faire"}
                                onChange={async e => {
                                  await handleEtatChange(t.id, e.target.value);
                                  setEtatSelectTacheId(null);
                                }}
                                onBlur={() => setEtatSelectTacheId(null)}
                                autoFocus
                                style={{
                                  borderRadius: "6px",
                                  padding: "2px 8px",
                                  border: "1px solid #bbb",
                                  fontWeight: "bold",
                                  marginRight: "10px"
                                }}
                              >
                                {etatOptions.map(etat => (
                                  <option key={etat} value={etat}>
                                    {etat.charAt(0).toUpperCase() + etat.slice(1)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                style={{
                                  background: "#eee",
                                  color: "#333",
                                  borderRadius: "6px",
                                  padding: "2px 10px",
                                  fontWeight: "bold",
                                  fontSize: "0.95rem",
                                  marginRight: "10px",
                                  cursor: canUpdate ? "pointer" : "default",
                                  border: canUpdate ? "1px solid #bbb" : "none"
                                }}
                                onClick={() => {
                                  if (canUpdate) setEtatSelectTacheId(t.id);
                                }}
                                title={canUpdate ? "Changer l'état" : ""}
                              >
                                {t.etat || "à faire"}
                              </span>
                            )}
                            {editTacheId === t.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editTitre}
                                  onChange={e => setEditTitre(e.target.value)}
                                  style={{ marginRight: 8 }}
                                />
                                <input
                                  type="text"
                                  value={editDesc}
                                  onChange={e => setEditDesc(e.target.value)}
                                  style={{ marginRight: 8 }}
                                />
                                <select
                                  value={editMembre}
                                  onChange={e => setEditMembre(Number(e.target.value))}
                                  style={{ marginRight: 8 }}
                                >
                                  <option value="">Affecter à...</option>
                                  {projetMembers.map((m: Member) => (
                                    <option key={m.id} value={m.id}>
                                      {m.username} {m.name && `(${m.name})`}
                                    </option>
                                  ))}
                                </select>
                              </>
                            ) : (
                              <>
                                {t.titre} — {t.description} <br />
                                <span style={{ fontWeight: "normal", fontSize: "1rem" }}>
                                  Affectée à : {t.membre?.username || "?"}
                                </span>
                              </>
                            )}
                            {isCurrentUserTacheOwner(t) && (
                              <span style={{
                                background: "#198754",
                                color: "#fff",
                                borderRadius: "6px",
                                padding: "2px 8px",
                                fontWeight: "bold",
                                marginLeft: "8px",
                                fontSize: "0.9rem"
                              }}>
                                Ma tâche
                              </span>
                            )}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {isManager && (
                              <span>
                                {editTacheId === t.id ? (
                                  <>
                                    <button
                                      onClick={async () => {
                                        await fetch(`/api/projet/${projet.id}/taches/${t.id}`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            titre: editTitre,
                                            description: editDesc,
                                            membre_id: editMembre
                                          }),
                                        });
                                        setEditTacheId(null);
                                        const res = await fetch(`/api/projet/${projet.id}/taches`);
                                        setTaches(res.ok ? await res.json() : []);
                                      }}
                                      style={{
                                        background: "#198754",
                                        color: "#fff",
                                        border: "none",
                                        padding: "4px 12px",
                                        borderRadius: "6px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        marginRight: "8px"
                                      }}
                                    >
                                      Enregistrer
                                    </button>
                                    <button
                                      onClick={() => setEditTacheId(null)}
                                      style={{
                                        background: "#dc3545",
                                        color: "#fff",
                                        border: "none",
                                        padding: "4px 12px",
                                        borderRadius: "6px",
                                        fontWeight: "bold",
                                        cursor: "pointer"
                                      }}
                                    >
                                      Annuler
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditTacheId(t.id);
                                        setEditTitre(t.titre);
                                        setEditDesc(t.description || "");
                                        setEditMembre(t.membre_id);
                                      }}
                                      style={{
                                        background: "#ffc107",
                                        color: "#222",
                                        border: "none",
                                        padding: "4px 12px",
                                        borderRadius: "6px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        marginRight: "8px"
                                      }}
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      onClick={async () => {
                                        // Suppression côté serveur
                                        await fetch(`/api/projet/${projet.id}/taches/${t.id}`, {
                                          method: "DELETE"
                                        });
                                        // Recharge la liste depuis la BD pour être sûr que c'est bien supprimé côté backend
                                        const res = await fetch(`/api/projet/${projet.id}/taches`);
                                        setTaches(res.ok ? await res.json() : []);
                                      }}
                                      style={{
                                        background: "#dc3545",
                                        color: "#fff",
                                        border: "none",
                                        padding: "4px 12px",
                                        borderRadius: "6px",
                                        fontWeight: "bold",
                                        cursor: "pointer"
                                      }}
                                    >
                                      Supprimer
                                    </button>
                                  </>
                                )}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
                <button
                  onClick={() => setShowTachesPage(false)}
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
                >
                  Retour
                </button>
              </div>
            )}
          </div>
          {/* Modal équipe et modals tâches restent inchangés, place-les en dehors de <section> */}
        </section>
        {/* Modal création tâche */}
        {showTacheModal && (
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
            onClick={() => setShowTacheModal(false)}
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
              <h3 style={{ margin: 0, fontWeight: "bold", color: "#222" }}>Créer une tâche</h3>
              <input
                type="text"
                placeholder="Titre de la tâche"
                value={tacheTitre}
                onChange={e => setTacheTitre(e.target.value)}
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc"
                }}
              />
              <textarea
                placeholder="Description"
                value={tacheDesc}
                onChange={e => setTacheDesc(e.target.value)}
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc"
                }}
              />
              <select
                value={tacheMembre}
                onChange={e => setTacheMembre(Number(e.target.value))}
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc"
                }}
              >
                <option value="">Affecter à...</option>
                {projetMembers.map((m: Member) => (
                  <option key={m.id} value={m.id}>
                    {m.username} {m.name && `(${m.name})`}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={handleCreateTache}
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
                  onClick={() => setShowTacheModal(false)}
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
        {/* Modal équipe */}
        {showEquipe && (
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
            onClick={() => setShowEquipe(false)}
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
              <h3 style={{ margin: 0, fontWeight: "bold", color: "#222" }}>Membres du projet</h3>
              <ul>
                {projetMembers.length === 0 ? (
                  <li>Aucun membre dans ce projet.</li>
                ) : (
                  projetMembers.map((m: Member) => (
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
                        {m.role && ` | rôle: ${m.role}`}
                      </span>
                      {isManager && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/projet/${projet.id}/membres/${m.id}`, {
                              method: "DELETE"
                            });
                            // Refresh
                            const res = await fetch(`/api/projet/${projet.id}/membres`);
                            setProjetMembers(res.ok ? await res.json() : []);
                          }}
                          style={{
                            background: "#dc3545",
                            color: "#fff",
                            border: "none",
                            padding: "4px 12px",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            marginLeft: "12px"
                          }}
                        >
                          Supprimer
                        </button>
                      )}
                    </li>
                  ))
                )}
              </ul>
              {/* Si manager, afficher la sélection des membres */}
              {isManager && (
                <>
                  <h4 style={{ margin: "16px 0 8px" }}>Ajouter un membre du groupe</h4>
                  <ul>
                    {allMembers
                      .filter((m: Member) => !projetMembers.some((pm: Member) => pm.id === m.id))
                      .map((m: Member) => (
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
                          <select
                            value={selectedRole[m.id] || ""}
                            onChange={e =>
                              setSelectedRole(r => ({ ...r, [m.id]: e.target.value }))
                            }
                            style={{
                              marginRight: "8px",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #ccc"
                            }}
                          >
                            <option value="">Choisir un rôle</option>
                            <option value="membre">Membre</option>
                            <option value="manager">Manager</option>
                            <option value="lead">Lead</option>
                            <option value="testeur">Testeur</option>
                            <option value="designer">Designer</option>
                            <option value="développeur">Développeur</option>
                          </select>
                          <button
                            onClick={async () => {
                              const role = selectedRole[m.id];
                              if (!role) {
                                alert("Choisis un rôle avant d'ajouter !");
                                return;
                              }
                              await fetch(`/api/projet/${projet.id}/membres`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ utilisateur_id: m.id, role }),
                              });
                              // Refresh
                              const res = await fetch(`/api/projet/${projet.id}/membres`);
                              setProjetMembers(res.ok ? await res.json() : []);
                            }}
                            style={{
                              background: "#198754",
                              color: "#fff",
                              border: "none",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                          >
                            Ajouter
                          </button>
                        </li>
                      ))}
                  </ul>
                </>
              )}
              <button
                onClick={() => setShowEquipe(false)}
                style={{
                  background: "#dc3545",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginTop: "12px"
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};


export default Projet;
