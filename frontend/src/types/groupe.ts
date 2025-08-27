export type Member = {
  id: string;
  username: string;
  email: string;
  role: string;
};

export type Group = {
  id: string;
  name: string;
  membres: Member[];
};
