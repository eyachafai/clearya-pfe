export type Member = {
  id: number;
  username: string;
  email?: string;
  name?: string;
  role?: string;
  keycloak_id?: string; // Ajoute ce champ
};
