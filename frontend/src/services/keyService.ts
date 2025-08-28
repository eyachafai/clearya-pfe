import apiClient from "./apiClient";

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
