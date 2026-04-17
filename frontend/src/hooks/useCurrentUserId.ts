import { useEffect, useState } from "react";
import { useKeycloak } from '@react-keycloak/web';

export function useCurrentUserId(): number | null {
  const { keycloak } = useKeycloak();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      const userIdFromStorage = Number(localStorage.getItem('utilisateur_id'));
      const userIdFromKeycloak = keycloak?.tokenParsed?.sub;

      if (userIdFromStorage) {
        setCurrentUserId(userIdFromStorage);
      } else if (userIdFromKeycloak) {
        fetch(`/api/users/by-keycloak/${userIdFromKeycloak}`)
          .then(res => res.ok ? res.json() : Promise.reject(res))
          .then(data => {
            if (data && data.id) {
              setCurrentUserId(data.id);
              localStorage.setItem('utilisateur_id', String(data.id));
            }
          })
          .catch(() => {});
      }
    }
  }, [keycloak, currentUserId]);
  

  return currentUserId;
}
