import { useEffect, useState } from "react";
import { FaEye, FaDownload } from "react-icons/fa";

const Fichiers = () => {
  const [files, setFiles] = useState<any[]>([]);
  useEffect(() => {
    fetch("http://localhost:5000/api/files")
      .then(res => res.ok ? res.json() : [])
      .then(data => setFiles(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontWeight: "bold", fontSize: 24, marginBottom: 24 }}>Tous les fichiers partagés</h2>
      {files.length === 0 ? (
        <div style={{ color: '#888', fontSize: 16 }}>Aucun fichier partagé.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxWidth: 600 }}>
          {files.map(file => {
            const fileUrl = `http://localhost:5000${file.file_url}`;
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Fichiers;
