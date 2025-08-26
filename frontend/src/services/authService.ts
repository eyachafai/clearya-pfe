import apiClient from "./apiClient";
let _token: string | null = null;

export const setToken = (token: string) => {
  _token = token;
};

export const getToken = (): string | null => {
  return _token;
};

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
}

export const updateProfile = async (userData: UserData) => {
  try {
    const response = await apiClient.put("/api/auth/profile", userData);
    return response.data;
  } catch (error: any) {
    // Axios error handling
    throw new Error(
      error.response?.data?.message ||
      error.response?.data ||
      error.message ||
      "Erreur lors de la mise à jour du profil."
    );
  }
};
