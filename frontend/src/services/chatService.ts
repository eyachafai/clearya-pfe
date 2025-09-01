import apiClient from "./apiClient";

export const sendMessage = async (data: any) => {
    try {
        await apiClient.post("/api/messages/messages/realtime", data);

    } catch (error) {
        console.error("Erreur envoi message:", error);
        throw error;
    }
};


export const lireFile = async (fileName: any) => {
    try {
        const response = await apiClient.get(`/file/${fileName}`, {
            responseType: "blob", // important si c’est un fichier binaire (pdf, image…)
        });
        return response.data;
    } catch (error) {
        console.error("Erreur lire file message:", error);
        throw error;
    }
};
