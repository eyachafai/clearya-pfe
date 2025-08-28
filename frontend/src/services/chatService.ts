import apiClient from "./apiClient";

export const sendMessage = async (data: any) => {
    try {
        await apiClient.post("/api/messages/messages/realtime", data);

    } catch (error) {
        console.error("Erreur envoi message:", error);
        throw error;
    }
};