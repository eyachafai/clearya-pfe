export type Message = {
  id: number;
  conversation_id: number;
  utilisateur_id: number;
  contenu: string;
  type: string;
  is_read: boolean;
  date_envoi: string;
  utilisateur?: {
    id: number;
    username: string;
    email: string;
  };
};

type UnreadCount = {
  [groupeId: number]: number;
};
export type { UnreadCount };
