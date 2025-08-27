export type Departement = {
  id: number;
  keycloak_id: string;
  name: string;
  description?: string | null;
  parent_id?: number | null;
};

export type UserInDep = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export type Role = {
  name: string;
  description?: string;
};
