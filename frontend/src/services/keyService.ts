import apiClient from "./apiClient";

import fs from 'fs';
import path from 'path';

export function getPublicKey() {
  return fs.readFileSync(path.join(__dirname, '../keys/public.pem'), 'utf8');
}


export const fetchPublicKey = async (): Promise<string> => {
    try {
        const res = await apiClient.get("api/keys/public-key");
        //    console.log('res fetchPublicKey ', res)
        return res.data.publicKey as string;
    } catch (err) {
        console.error("Erreur fetchPublicKey:", err);
        throw err;
    }
};