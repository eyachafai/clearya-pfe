import { useEffect, useState } from "react";
import { FaEye, FaDownload, FaFileAlt  } from "react-icons/fa";

const Fichiers = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    fetch("http://localhost:5000/api/files")
      .then(res => res.ok ? res.json() : [])
      .then(data => setFiles(Array.isArray(data) ? data : []));
  }, []);

  const filteredFiles = files.filter(f => f.file_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(120deg,#eaf1fb 0%,#f5f6fa 100%)", padding: "48px 0" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", background: "#fff", borderRadius: 22, boxShadow: "0 8px 32px rgba(0,0,0,0.10)", padding: 44 }}>
        {/* 🔄 Ici j'ai remplacé FaUserCircle par FaFileAlt */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <FaFileAlt size={38} color="#198754" style={{ marginRight: 12 }} />
          <h2 style={{ fontWeight: "bold", fontSize: 30, color: "#222", letterSpacing: 1, margin: 0 }}>
            Tous les fichiers partagés
          </h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Rechercher un fichier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #eaf1fb', fontSize: 16, width: 320, background: '#f5f6fa' }}
          />
          <span style={{ color: '#888', fontSize: 16 }}>
            {filteredFiles.length} fichier{filteredFiles.length > 1 ? 's' : ''}
          </span>
        </div>
        {filteredFiles.length === 0 ? (
          <div style={{ color: '#888', fontSize: 20, textAlign: 'center', marginTop: 40 }}>Aucun fichier partagé.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filteredFiles.map(file => {
              const fileUrl = `http://localhost:5000${file.file_url}`;
              return (
                <li key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0', borderBottom: '1px solid #eaf1fb', background: '#f9fbff', borderRadius: 12, marginBottom: 8, transition: 'box-shadow 0.2s, background 0.2s', boxShadow: '0 0px 0px #eaf1fb' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#eaf1fb', e.currentTarget.style.boxShadow = '0 4px 16px #eaf1fb')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f9fbff', e.currentTarget.style.boxShadow = '0 0px 0px #eaf1fb')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#222', fontSize: 19, wordBreak: 'break-word', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 340 }}>{file.file_name}</div>
                    <div style={{ color: '#888', fontSize: 15, marginTop: 4, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                      {file.file_type && <span>{file.file_type}</span>}
                      {file.created_at && <span>Ajouté le {new Date(file.created_at).toLocaleDateString()}</span>}
                      {file.size && <span>{file.size} Ko</span>}
                    </div>
                    <div style={{ color: '#198754', fontSize: 15, marginTop: 2 }}>
                      Ajouté par : <b>{file.owner?.username || file.owner?.email || 'Utilisateur inconnu'}</b>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#198754', background: '#eaf1fb', borderRadius: 8, padding: 8, transition: 'background 0.2s', boxShadow: '0 2px 8px #eaf1fb' }} title="Voir le fichier">
                      <FaEye size={22} />
                    </a>
                    <a href={fileUrl} download style={{ color: '#198754', background: '#eaf1fb', borderRadius: 8, padding: 8, transition: 'background 0.2s', boxShadow: '0 2px 8px #eaf1fb' }} title="Télécharger">
                      <FaDownload size={22} />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Fichiers;
