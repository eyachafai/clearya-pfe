import { Member } from './membre';

export type Tache = {
  id: number;
  titre: string;
  description: string;
  membre_id: number;
  membre?: Member;
  etat?: string;
};
