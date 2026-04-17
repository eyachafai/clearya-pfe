import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Member } from "../../types/membre";
import { Tache } from "../../types/taches";
import { useCurrentUserId } from "../../hooks/useCurrentUserId";
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
// @ts-ignore
import * as XLSX from 'xlsx';
import './rapport-table.css';

interface Rapport {
  id: number;
  nom: string;
  date: string;
  type: string;
  chemin_fichier: string;
  auteur?: string;
  projet_id?: number;
}

const Projet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const projet = location.state?.projet;
  const group = location.state?.group;
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

  const [etatOptions, setEtatOptions] = useState(["a faire", "en cours", "terminee"]);
  const [showRapport, setShowRapport] = useState(false);
  const [rapportTaches, setRapportTaches] = useState<Tache[]>([]);
  const [rapportComment, setRapportComment] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [historiqueRapports, setHistoriqueRapports] = useState<Rapport[]>([
    { id: 1, nom: 'Rapport Janvier', date: '2024-01-31', auteur: '', type: 'PDF', chemin_fichier: '#', projet_id: 3 },
    { id: 2, nom: 'Rapport Février', date: '2024-02-28', auteur: '', type: 'Excel', chemin_fichier: '#', projet_id: 3 },
  ]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('PDF');
  const [exportNom, setExportNom] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [filtreDate, setFiltreDate] = useState('');
  const [exportFile, setExportFile] = useState<File | null>(null);

  const currentUserId = useCurrentUserId();
  const [allMembers, setAllMembers] = useState<Member[]>([]);


  useEffect(() => {
    // Redirige si pas de projet (ex: refresh direct sur l'URL)
    if (!projet) {
      navigate("/projets");
      return;
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
        console.log('res ', res)
        if (res.ok) {
          setEtatOptions(await res.json());
        } else {
          setEtatOptions(["a faire", "en cours", "terminee"]);
        }
      } catch {
        setEtatOptions(["a faire", "en cours", "terminee"]);
      }
    }
    fetchEtats();

     // Récupère le keycloak_id (sub) du user connecté
    let keycloakId = localStorage.getItem("keycloak_id") || localStorage.getItem("sub");
    // Mappe sur les membres du projet pour trouver l'id interne
    const membre = projetMembers.find((m: any) => m.keycloak_id === keycloakId);
    if (membre) {
      console.log('[useEffect] Membre trouvé pour keycloak_id', keycloakId, membre);
    }
  }, [projet, navigate]);

  useEffect(() => {
    // Charger tous les membres du groupe pour l'ajout (si manager)
    if (group?.id) {
      fetch(`/api/groupes/${group.id}/members`)
        .then(res => res.json())
        .then(data => setAllMembers(data));
    }
  }, [projet, navigate, group]);

  // Vérifie si user est manager (optionnel, à adapter selon ton besoin)
  // const isManager = ...;
  const isManager = group?.role && group.role.toLowerCase().includes("manager");

  if (!projet) return null; // évite le rendu blanc sans rien

// Ajout d'une tâche (manager uniquement)
  const handleCreateTache = async () => {
    console.log('handleCreateTache', { tacheTitre, tacheDesc, tacheMembre });
    if (!tacheTitre.trim() || !tacheMembre) {
      alert('Titre et membre sont obligatoires');
      return;
    }
    const res = await fetch(`/api/projet/${projet.id}/taches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: tacheTitre,
        description: tacheDesc,
        membre_id: tacheMembre
      }),
    });
    console.log('POST /api/projet/:id/taches status:', res.status);
    if (res.ok) {
      setShowTacheModal(false);
      setTacheTitre("");
      setTacheDesc("");
      setTacheMembre("");
      // Refresh
      const tachesRes = await fetch(`/api/projet/${projet.id}/taches`);
      setTaches(tachesRes.ok ? await tachesRes.json() : []);
    } else {
      const err = await res.text();
      alert("Erreur lors de la création de la tâche: " + err);
      console.error('Erreur création tâche:', err);
    }
  };

  const handleEtatChange = async (tacheId: number, newEtat: string) => {
    // Normalisation de l'état pour l'API
    let etatApi = newEtat;
    if (etatApi === "terminée") etatApi = "terminee";
    if (etatApi === "à faire") etatApi = "a faire";
    console.log('handleEtatChange called:', { tacheId, newEtat, etatApi, currentUserId });
    if (!etatOptions.includes(etatApi)) return;
    try {
      console.log('Sending PATCH request to backend...');
      const r = await fetch(`/api/projet/${projet.id}/taches/${tacheId}/etat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etat: etatApi, utilisateur_id: currentUserId }),
      });
      console.log("r", r)
      console.log('PATCH response:', r.status, await r.clone().text());
      if (r.ok) {
        const updated = await r.json();
        setTaches(prev => prev.map(x => x.id === tacheId ? updated : x));
      } else {
        const err = await r.json().catch(() => ({}));
        alert(err?.error || "Erreur changement état");
      }
    } catch (err) {
      alert("Erreur lors du changement d'état");
    }
  };

  const isCurrentUserTacheOwner = (t: Tache) => {
    console.log('currentUserId ', currentUserId)
    console.log('membre_id ', t.membre_id)

    return currentUserId !== null && Number(t.membre_id) === Number(currentUserId);
  };

  // Fonction pour télécharger le rapport PDF
  const handleDownloadPDF = async () => {
    // S'assurer que rapportTaches contient toutes les tâches terminées
    let tachesTerminees = rapportTaches;
    if (!tachesTerminees || tachesTerminees.length === 0) {
      const res = await fetch(`/api/projet/${projet.id}/taches?etat=terminee`);
      tachesTerminees = res.ok ? await res.json() : [];
    }
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Rapport des tâches terminées', 15, 20);
    doc.setFontSize(12);
    doc.text(`Projet : ${projet?.name || ''}`, 15, 30);
    doc.text(`Date du rapport : ${new Date().toLocaleString()}`, 15, 36);
    if (rapportComment) doc.text(`Commentaire : ${rapportComment}`, 15, 42);
    // Statistiques globales
    const total = taches.length;
    const terminees = taches.filter(t => t.etat === 'terminee').length;
    const nonTerminees = total - terminees;
    const percentTerminees = total ? Math.round((terminees / total) * 100) : 0;
    let y = 50;
    doc.text(`Total tâches : ${total}`, 15, y);
    doc.text(`Terminées : ${terminees}`, 15, y + 6);
    doc.text(`Non terminées : ${nonTerminees}`, 15, y + 12);
    doc.text(`% Terminées : ${percentTerminees}%`, 15, y + 18);
    y += 30;
    // Tableau des tâches
    doc.setFont('helvetica', 'bold');
    doc.text('Titre', 15, y);
    doc.text('Description', 70, y);
    doc.text('Membre', 150, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
    tachesTerminees.forEach(t => {
      doc.text(String(t.titre), 15, y);
      doc.text(String(t.description || ''), 70, y);
      doc.text(String(t.membre?.username || '?'), 150, y);
      y += 8;
    });
    // Tableau par membre avec description (uniquement tâches terminées)
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Tâches terminées par membre', 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    const membres: Record<string, { taches: { titre: string; description: string }[] }> = {};
    tachesTerminees.forEach(t => {
      const nom = t.membre?.username || 'Inconnu';
      if (!membres[nom]) membres[nom] = { taches: [] };
      membres[nom].taches.push({ titre: t.titre || '', description: t.description || '' });
    });
    Object.entries(membres).forEach(([nom, data]) => {
      doc.text(`${nom}: ${data.taches.length} tâches terminées`, 15, y);
      y += 7;
      data.taches.forEach(task => {
        doc.text(`- ${task.titre}: ${task.description}`, 20, y);
        y += 6;
      });
      y += 2;
    });
    doc.save('rapport-taches-terminees.pdf');
  };

  // Fonction PDF avancée
  const handleDownloadPDFPro = () => {
    const doc = new jsPDF();
    // Logo (placeholder)
    // doc.addImage(logoBase64, 'PNG', 15, 10, 30, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Rapport des tâches terminées', 15, 30);
    doc.setFontSize(12);
    doc.text(`Projet : ${projet?.name || ''}`, 15, 40);
    doc.text(`Statut : ${projet?.status || 'En cours'}`, 15, 46);
    doc.text(`Date du rapport : ${new Date().toLocaleString()}`, 15, 52);
    // Statistiques globales
    const total = taches.length;
    const terminees = taches.filter(t => t.etat === 'terminee').length;
    const nonTerminees = total - terminees;
    const percentTerminees = total ? Math.round((terminees / total) * 100) : 0;
    doc.text(`Total tâches : ${total}`, 15, 60);
    doc.text(`Terminées : ${terminees}`, 15, 66);
    doc.text(`Non terminées : ${nonTerminees}`, 15, 72);
    doc.text(`% Terminées : ${percentTerminees}%`, 15, 78);
    // Commentaire personnalisé
    if (rapportComment) doc.text(`Commentaire : ${rapportComment}`, 15, 86);
    // Graphique (placeholder)
    // doc.addImage(graphBase64, 'PNG', 120, 30, 60, 40);
    // Tableau des tâches
    autoTable(doc, {
      startY: 95,
      head: [['Titre', 'Description', 'Membre', 'Etat']],
      body: rapportTaches.map(t => [t.titre || '', t.description || '', t.membre?.username || '', t.etat || '']),
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 246, 250] }
    });
    // Détail par membre
    const dataMembre: Record<string, number> = {};
    rapportTaches.forEach(t => {
      const nom = t.membre?.username || 'Inconnu';
      dataMembre[nom] = (dataMembre[nom] || 0) + 1;
    });
    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 105) + 10,
      head: [['Membre', 'Tâches terminées']],
      body: Object.entries(dataMembre).map(([nom, count]) => [nom, String(count)]),
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 246, 250] }
    });
    // Historique (placeholder)
    // autoTable(doc, { ... });
    doc.save('rapport-taches-terminees-pro.pdf');
  };

  // Fonction Excel
  const handleDownloadExcel = () => {
    // Feuille des tâches
    const ws1 = XLSX.utils.json_to_sheet(rapportTaches.map(t => ({
      Titre: t.titre,
      Description: t.description,
      Membre: t.membre?.username || '?',
      Etat: t.etat
    })));
    // Feuille des stats par membre
    const membres: Record<string, { total: number; terminees: number }> = {};
    taches.forEach(t => {
      const nom = t.membre?.username || 'Inconnu';
      if (!membres[nom]) membres[nom] = { total: 0, terminees: 0 };
      membres[nom].total += 1;
      if (t.etat === 'terminee') membres[nom].terminees += 1;
    });
    const ws2 = XLSX.utils.json_to_sheet(
      Object.entries(membres).map(([nom, data]) => ({
        Membre: nom,
        'Tâches terminées': data.terminees,
        'Tâches totales': data.total
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Tâches terminées');
    XLSX.utils.book_append_sheet(wb, ws2, 'Stats par membre');
    // Ajout d'une feuille de résumé
    const resume = [
      ['Projet', projet?.name || ''],
      ['Date du rapport', new Date().toLocaleString()],
      ['Commentaire', rapportComment],
      ['Total tâches', taches.length],
      ['Terminées', taches.filter(t => t.etat === 'terminee').length],
      ['Non terminées', taches.filter(t => t.etat !== 'terminee').length],
      ['% Terminées', taches.length ? Math.round((taches.filter(t => t.etat === 'terminee').length / taches.length) * 100) + '%' : '0%']
    ];
    const wsResume = XLSX.utils.aoa_to_sheet(resume);
    XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé');
    XLSX.writeFile(wb, 'rapport-taches-terminees.xlsx');
  };

  useEffect(() => {
    if (showHistorique && projet?.id) {
      fetch(`http://localhost:5000/api/rapports?projet_id=${projet.id}`)
        .then(res => res.json())
        .then(data => setHistoriqueRapports(data));
    }
  }, [showHistorique, projet]);

  // Fonction d'export
  const handleExportRapport = async () => {
    setExportLoading(true);
    const nom = exportNom || `Rapport ${new Date().toLocaleDateString()}`;
    const formData = new FormData();
    formData.append('nom', nom);
    formData.append('date', new Date().toISOString().slice(0, 10));
    formData.append('type', exportType);
    formData.append('projet_id', String(projet?.id || ''));
    formData.append('auteur', group?.name || 'manager');
    if (exportFile) formData.append('fichier', exportFile);
    await fetch('/api/rapports', {
      method: 'POST',
      body: formData
    });
    setShowExportModal(false);
    setExportLoading(false);
    // Recharge la liste
    fetch(`http://localhost:5000/api/rapports?projet_id=${projet.id}`)
      .then(res => res.json())
      .then(data => setHistoriqueRapports(data));
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
            <li style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>
              <button
                style={{ background: "none", border: "none", color: "inherit", font: "inherit", width: "100%", textAlign: "left", padding: 0, cursor: "pointer" }}
                onClick={() => setShowEquipe(true)}
              >Equipe</button>

            </li>
            <li style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>
              <button
                style={{ background: "none", border: "none", color: "inherit", font: "inherit", width: "100%", textAlign: "left", padding: 0, cursor: "pointer" }}
                onClick={() => setShowRapport(true)}
              >Rapport</button>
            </li>
            <li style={{ margin: "8px 16px", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>
              <button
                style={{ background: "none", border: "none", color: "inherit", font: "inherit", width: "100%", textAlign: "left", padding: 0, cursor: "pointer" }}
                onClick={() => setShowHistorique(true)}
              >Historique</button>



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
        {showEquipe ? (
          <section style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: '32px', marginTop: '32px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            <h3 style={{ margin: 0, fontWeight: 'bold', color: '#222', marginBottom: '18px' }}>Membres du projet</h3>
            <ul>
              {projetMembers.length === 0 ? (
                <li>Aucun membre dans ce projet.</li>
              ) : (
                projetMembers.map((m: Member) => (
                  <li key={m.id} style={{
                    background: '#f6f6fa',
                    borderRadius: '8px',
                    padding: '12px 18px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 'bold',
                    color: '#222'
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
                            method: 'DELETE'
                          });
                          const res = await fetch(`/api/projet/${projet.id}/membres`);
                          setProjetMembers(res.ok ? await res.json() : []);
                        }}
                        style={{
                          background: '#fff',
                          color: '#222',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          marginLeft: '12px',
                          fontSize: '1.2rem'
                        }}
                        title="Supprimer"
                      >
                        <span role="img" aria-label="poubelle">🗑️</span>
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
            {isManager && (
              <>
                <h4 style={{ margin: '16px 0 8px' }}>Ajouter un membre du groupe</h4>
                <ul>
                  {allMembers
                    .filter((m: Member) => !projetMembers.some((pm: Member) => pm.id === m.id))
                    .map((m: Member) => (
                      <li key={m.id} style={{
                        background: '#f6f6fa',
                        borderRadius: '8px',
                        padding: '12px 18px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        color: '#222'
                      }}>
                        <span>
                          {m.username}
                          {m.name && ` (${m.name})`}
                          {m.email && ` - ${m.email}`}
                        </span>
                        <select
                          value={selectedRole[m.id] || ''}
                          onChange={e => setSelectedRole(r => ({ ...r, [m.id]: e.target.value }))}
                          style={{
                            marginRight: '8px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                          }}
                        >
                          <option value=''>Choisir un rôle</option>
                          <option value='membre'>Membre</option>
                          <option value='manager'>Manager</option>
                          <option value='lead'>Lead</option>
                          <option value='testeur'>Testeur</option>
                          <option value='designer'>Designer</option>
                          <option value='développeur'>Développeur</option>
                        </select>
                        <button
                          onClick={async () => {
                            const role = selectedRole[m.id];
                            if (!role) {
                              alert("Choisis un rôle avant d'ajouter !");
                              return;
                            }
                            await fetch(`/api/projet/${projet.id}/membres`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ utilisateur_id: m.id, role }),
                            });
                            const res = await fetch(`/api/projet/${projet.id}/membres`);
                            setProjetMembers(res.ok ? await res.json() : []);
                          }}
                          style={{
                            background: '#fff',
                            color: '#222',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1.2rem'
                          }}
                          title="Ajouter"
                        >
                          <span role="img" aria-label="ajouter">➕</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </>
            )}
            <button
              onClick={() => setShowEquipe(false)}
              style={{
                background: '#000000ff',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontWeight: 'bold',
                marginTop: '18px',
                cursor: 'pointer'
              }}
            >Fermer</button>
          </section>
        ) : showHistorique ? (
          <section style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: '32px', marginTop: '32px', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontWeight: 'bold', fontSize: '2rem', color: '#222' }}>Historique des rapports</h2>
              {isManager && (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Exporter un rapport" onClick={() => setShowExportModal(true)}>
                  <span role="img" aria-label="export" style={{ fontSize: '2rem', color: '#222' }}>⬆️</span>
                </button>
              )}
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontWeight: 'bold', marginRight: '12px' }}>Filtrer par date :</label>
              <input type="date" value={filtreDate} onChange={e => setFiltreDate(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '16px', overflow: 'hidden', fontSize: '1.08rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <thead>
                <tr style={{ background: '#222', color: '#fff' }}>
                  <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold' }}>Date</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold' }}>Nom</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold' }}>Type</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold' }}>Télécharger</th>
                </tr>
              </thead>
              <tbody>
                {historiqueRapports.filter(r => !filtreDate || r.date === filtreDate).map(r => (
                  <tr key={r.id} style={{ background: '#f6f6f6' }}>
                    <td style={{ padding: '14px' }}>{r.date}</td>
                    <td style={{ padding: '14px' }}>{r.nom}</td>
                    <td style={{ padding: '14px' }}>{r.type}</td>
                    <td style={{ padding: '14px' }}>
                      <button style={{ background: '#000000ff', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => window.open(`/api/rapports/${r.id}/download`, '_blank')}>Télécharger</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={{ background: '#000000ff', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 'bold', marginTop: '18px', cursor: 'pointer' }} onClick={() => setShowHistorique(false)}>Fermer</button>
            {/* Modal export rapport */}
            {showExportModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: '340px', maxWidth: '420px', padding: '32px 28px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#222', marginBottom: '8px', textAlign: 'center' }}>
                    Exporter un rapport
                  </div>
                  <input type="text" placeholder="Nom du rapport" value={exportNom} onChange={e => setExportNom(e.target.value)} style={{ width: '100%', borderRadius: '8px', border: '1px solid #ccc', padding: '8px', fontSize: '1rem' }} />
                  <select value={exportType} onChange={e => setExportType(e.target.value)} style={{ width: '100%', borderRadius: '8px', border: '1px solid #ccc', padding: '8px', fontSize: '1rem' }}>
                    <option value="PDF">PDF</option>
                    <option value="Excel">Excel</option>
                  </select>
                  <input type="file" onChange={e => setExportFile(e.target.files?.[0] || null)} style={{ width: '100%', marginTop: '8px' }} />
                  <button style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }} onClick={handleExportRapport} disabled={exportLoading || !exportFile}>{exportLoading ? 'Export...' : 'Exporter'}</button>
                  <button style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontWeight: 'bold', marginTop: '8px', cursor: 'pointer' }} onClick={() => setShowExportModal(false)}>Annuler</button>
                </div>
              </div>
            )}
          </section>
        ) : (
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
                      <div style={{ display: "flex", gap: "8px" }}>
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
                        <button
                          style={{
                            background: "#050505ff",
                            color: "#fff",
                            border: "none",
                            padding: "8px",
                            borderRadius: "50%",
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px"
                          }}
                          title="Rapport tâches terminées"
                          onClick={async () => {
                            setShowRapport(true);
                            const res = await fetch(`/api/projet/${projet.id}/taches?etat=terminee`);
                            setRapportTaches(res.ok ? await res.json() : []);
                          }}
                        >
                          <span role="img" aria-label="rapport" style={{ fontSize: "1.3rem" }}>📄</span>
                        </button>
                      </div>
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
                                  value={t.etat || "a faire"}
                                  onChange={e => {
                                    console.log('select changed', e.target.value, t.id);
                                    handleEtatChange(t.id, e.target.value);
                                  }}
                                  autoFocus
                                  style={{
                                    borderRadius: "6px",
                                    padding: "2px 8px",
                                    border: "1px solid #bbb",
                                    fontWeight: "bold",
                                    marginRight: "10px"
                                  }}
                                >
                                  {etatOptions.map(etat => {
                                    let label = etat;
                                    if (etat === "a faire") label = "À faire";
                                    else if (etat === "en cours") label = "En cours";
                                    else if (etat === "terminee") label = "Terminée";
                                    return (
                                      <option key={etat} value={etat}>{label}</option>
                                    );
                                  })}
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
                                  title={canUpdate ? "Changer l'état" : ""}
                                >
                                  {t.etat === "a faire" ? "À faire" : t.etat === "en cours" ? "En cours" : t.etat === "terminee" ? "Terminée" : t.etat}
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
                                  background: "#000000ff",
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
                                          background: "#000000ff",
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
                                          background: "#fff",
                                          color: "#222",
                                          border: "none",
                                          padding: "4px 12px",
                                          borderRadius: "6px",
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          marginRight: "8px",
                                          fontSize: "1.2rem"
                                        }}
                                        title="Modifier"
                                      >
                                        <span role="img" aria-label="modifier">🖉</span>
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
                                          background: "#fff",
                                          color: "#222",
                                          border: "none",
                                          padding: "4px 12px",
                                          borderRadius: "6px",
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          fontSize: "1.2rem"
                                        }}
                                        title="Supprimer"
                                      >
                                        <span role="img" aria-label="poubelle">🗑️</span>
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
              {/* Section KPI/rapport dans le composant Projet */}
              {showRapport && !showTachesPage && (
                <section style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: '32px', marginTop: '32px', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontWeight: 'bold', fontSize: '2rem', color: '#222', marginBottom: '18px' }}>
                      KPI de l'équipe
                    </h2>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '12px' }}
                      title="Télécharger le rapport"
                      onClick={() => setShowDownloadModal(true)}
                    >
                      <span role="img" aria-label="download" style={{ fontSize: '2rem', color: '#222' }}>⬇️</span>
                    </button>
                  </div>
                  {/* Statistiques globales */}
                  <div style={{ display: 'flex', gap: '32px', marginBottom: '24px' }}>
                    <div style={{ background: '#f5f6fa', borderRadius: '12px', padding: '18px 32px', minWidth: '180px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#222222ff' }}>Total tâches</div>
                      <div style={{ fontWeight: 'bold', fontSize: '2rem', color: '#1d6e24ff' }}>{taches.length}</div>
                    </div>
                    <div style={{ background: '#f5f6fa', borderRadius: '12px', padding: '18px 32px', minWidth: '180px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#222' }}>Terminées</div>
                      <div style={{ fontWeight: 'bold', fontSize: '2rem', color: '#222' }}>{taches.filter(t => t.etat === 'terminee').length}</div>
                    </div>
                    <div style={{ background: '#f5f6fa', borderRadius: '12px', padding: '18px 32px', minWidth: '180px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#222' }}>Non terminées</div>
                      <div style={{ fontWeight: 'bold', fontSize: '2rem', color: '#dc3545' }}>{taches.filter(t => t.etat !== 'terminee').length}</div>
                    </div>
                    <div style={{ background: '#f5f6fa', borderRadius: '12px', padding: '18px 32px', minWidth: '180px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#222' }}>% Terminées</div>
                      <div style={{ fontWeight: 'bold', fontSize: '2rem', color: '#222' }}>{taches.length ? Math.round((taches.filter(t => t.etat === 'terminee').length / taches.length) * 100) : 0}%</div>
                    </div>
                  </div>
                  {/* Graphiques (placeholders) */}
                  <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', justifyContent: 'center' }}>
                    <div style={{ background: '#fafbfc', borderRadius: '16px', padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#222', fontSize: '1.08rem', textAlign: 'center' }}>Répartition des tâches</div>
                      {/* Camembert SVG placeholder */}
                      {/* Remplacer par recharts plus tard */}
                      <svg width="200" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="#eee" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#232323ff" strokeWidth="20" strokeDasharray={`${Math.round((taches.filter(t => t.etat === 'terminee').length / (taches.length || 1)) * 314)} 314`} strokeDashoffset="0" />
                      </svg>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.98rem' }}>
                        <span style={{ color: '#232323ff', fontWeight: 'bold' }}>Terminées</span>
                        <span style={{ color: '#bbb', fontWeight: 'bold' }}>Non terminées</span>
                      </div>
                    </div>
                    <div style={{ background: '#fafbfc', borderRadius: '16px', padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minWidth: '220px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#222', fontSize: '1.08rem', textAlign: 'center' }}>Tâches terminées par membre</div>                    {/* Bar chart placeholder */}
                      {(() => {
                        const data: Record<string, number> = {};
                        taches.filter(t => t.etat === 'terminee').forEach(t => {
                          const nom = t.membre?.username || 'Inconnu';
                          data[nom] = (data[nom] || 0) + 1;
                        });
                        const max = Math.max(...Object.values(data), 1);
                        return Object.entries(data).map(([nom, count]) => (
                          <div key={nom} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ width: '110px', fontWeight: 'bold', color: '#222' }}>{nom}</span>
                            <div style={{
                              height: '18px',
                              width: `${60 + (Number(count) / max) * 180}px`,
                              background: '#313030ff',
                              borderRadius: '8px',
                              marginRight: '12px',
                              transition: 'width 0.3s',
                              boxShadow: '0 1px 4px rgba(68,68,68,0.08)'
                            }}></div>
                            <span style={{ fontWeight: 'bold', color: '#222', minWidth: '24px' }}>{String(count)}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  {/* Tableau des tâches par membre */}
                  <div style={{ marginBottom: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '16px', overflow: 'hidden', fontSize: '1.08rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <thead>
                        <tr style={{ background: '#222', color: '#fff' }}>
                          <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold', fontSize: '1.08rem' }}>Membre</th>
                          <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold', fontSize: '1.08rem' }}>Tâches terminées</th>
                          <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold', fontSize: '1.08rem' }}>Tâches totales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const membres: Record<string, { total: number; terminees: number }> = {};
                          taches.forEach(t => {
                            const nom = t.membre?.username || 'Inconnu';
                            if (!membres[nom]) membres[nom] = { total: 0, terminees: 0 };
                            membres[nom].total += 1;
                            if (t.etat === 'terminee') membres[nom].terminees += 1;
                          });
                          return Object.entries(membres).map(([nom, data]) => (
                            <tr key={nom} style={{ background: '#f6f6f6' }}>
                              <td style={{ padding: '14px', fontWeight: 'bold', color: '#222' }}>{nom}</td>
                              <td style={{ padding: '14px', color: '#313030ff', fontWeight: 'bold' }}>{data.terminees}</td>
                              <td style={{ padding: '14px', color: '#222', fontWeight: 'bold' }}>{data.total}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {/* Date de génération et statut */}
                  <div style={{ marginBottom: '18px', color: '#666', fontSize: '1.08rem', textAlign: 'center' }}>
                    Rapport généré le {new Date().toLocaleString()}<br />
                    Statut du projet : <span style={{ fontWeight: 'bold', color: '#222' }}>{projet?.status || 'En cours'}</span>
                  </div>
                  {/* Logo Clearya */}
                  <div style={{ textAlign: 'center', marginTop: '32px' }}>
                    <img src="/clearya-logo.svg" alt="Logo Clearya" style={{ width: '120px', opacity: 0.7 }} />
                  </div>
                  <button
                    style={{ background: '#000000ff', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 'bold', marginTop: '18px', cursor: 'pointer' }}
                    onClick={() => setShowRapport(false)}
                  >Fermer le rapport</button>
                  {/* Modal de téléchargement du rapport */}
                  {showDownloadModal && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      background: 'rgba(0,0,0,0.10)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 3000
                    }}>
                      <div style={{
                        background: '#fff',
                        borderRadius: '24px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        minWidth: '340px',
                        maxWidth: '420px',
                        padding: '32px 28px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px',
                        alignItems: 'center'
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#222', marginBottom: '8px', textAlign: 'center' }}>
                          Télécharger le rapport
                        </div>
                        <textarea
                          placeholder="Ajouter un commentaire (optionnel)"
                          value={rapportComment}
                          onChange={e => setRapportComment(e.target.value)}
                          style={{ width: '100%', minHeight: '60px', borderRadius: '8px', border: '1px solid #ccc', padding: '8px', fontSize: '1rem' }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
                          <button
                            style={{ background: '#000000ff', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 'bold', cursor: 'pointer' }}
                            onClick={() => { handleDownloadPDF(); setShowDownloadModal(false); }}
                          >PDF</button>
                          <button
                            style={{ background: '#222', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 'bold', cursor: 'pointer' }}
                            onClick={() => { handleDownloadExcel(); setShowDownloadModal(false); }}
                          >Excel</button>
                        </div>
                        <button
                          style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontWeight: 'bold', marginTop: '8px', cursor: 'pointer' }}
                          onClick={() => setShowDownloadModal(false)}
                        >Annuler</button>
                      </div>
                    </div>
                  )}
                </section>
              )}
              {/* Modal rapport tâches terminées par membre */}
              {showRapport && showTachesPage && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2000
                }}>
                  <div style={{
                    background: '#fff',
                    borderRadius: '32px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    minWidth: '480px',
                    maxWidth: '700px',
                    padding: '40px 48px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', width: '100%' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.6rem', color: '#222', textAlign: 'center', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                        Rapport des tâches terminées par membre
                      </div>
                      <button
                        onClick={() => setShowRapport(false)}
                        style={{
                          background: '#f5f6fa',
                          border: 'none',
                          borderRadius: '50%',
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          color: '#888',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                        }}
                        title="Fermer"
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ marginBottom: '12px', color: '#666', fontSize: '1.08rem', textAlign: 'center' }}>
                      Récapitulatif des tâches terminées par membre pour le projet <span style={{ fontWeight: 'bold', color: '#222' }}>{projet?.name}</span>
                    </div>
                    {/* Nouveau tableau avec description */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '16px', overflow: 'hidden', fontSize: '1.08rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <thead>
                        <tr style={{ background: '#222', color: '#fff' }}>
                          <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold', fontSize: '1.08rem' }}>Membre</th>
                          <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold', fontSize: '1.08rem' }}>Titre</th>
                          <th style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold', fontSize: '1.08rem' }}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Regrouper les tâches terminées par membre
                          const membres: Record<string, { titre: string; description: string }[]> = {};
                          taches.filter(t => t.etat === 'terminee').forEach(t => {
                            const nom = t.membre?.username || 'Inconnu';
                            if (!membres[nom]) membres[nom] = [];
                            membres[nom].push({ titre: t.titre || '', description: t.description || '' });
                          });
                          return Object.entries(membres).map(([nom, tasks]) => (
                            tasks.length > 0 ? tasks.map((task, idx) => (
                              <tr key={nom + idx} style={{ background: '#f6f6f6' }}>
                                <td style={{ padding: '14px', fontWeight: 'bold', color: '#222' }}>{idx === 0 ? nom : ''}</td>
                                <td style={{ padding: '14px', color: '#000000ff', fontWeight: 'bold' }}>{task.titre}</td>
                                <td style={{ padding: '14px', color: '#222', fontWeight: 'normal' }}>{task.description}</td>
                              </tr>
                            )) : (
                              <tr key={nom} style={{ background: '#f6f6f6' }}>
                                <td style={{ padding: '14px', fontWeight: 'bold', color: '#222' }}>{nom}</td>
                                <td style={{ padding: '14px', color: '#dc3545', fontWeight: 'bold' }}>Aucune tâche terminée</td>
                                <td style={{ padding: '14px', color: '#222', fontWeight: 'normal' }}>-</td>
                              </tr>
                            )
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            {/* Modal équipe et modals tâches restent inchangés, place-les en dehors de <section> */}
          </section>
        )}
      </main>
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
    </div>
  );
};

export default Projet;
