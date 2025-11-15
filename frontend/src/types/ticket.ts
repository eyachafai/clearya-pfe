import { Member } from './membre';

export type Ticket = {
  id: number;
  titre: string;
  description: string;
  assignee_id: number;
  assignee?: Member;
  etat: string;
  created_by: number;
  creator?: Member;
  resolved_at?: string;
};