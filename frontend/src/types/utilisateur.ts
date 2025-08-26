export type Utilisateur = {
  id: number;
  keycloak_id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
};
