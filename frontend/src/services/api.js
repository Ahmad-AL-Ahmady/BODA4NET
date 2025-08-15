/**
 * API Service for BODA 4 NET Frontend
 * Handles all communication with the backend API
 */

const API_BASE_URL = "http://localhost:3001/api";

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }

  return data;
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Authentication API calls
export const authAPI = {
  // User registration
  signup: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // User login
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  // Logout
  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgotPassword`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  // Verify OTP
  verifyOTP: async (email, otp) => {
    const response = await fetch(`${API_BASE_URL}/auth/verifyOTP`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse(response);
  },

  // Reset password
  resetPassword: async (resetToken, newPassword, passwordConfirm) => {
    const response = await fetch(`${API_BASE_URL}/auth/resetPassword`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resetToken,
        password: newPassword,
        passwordConfirm,
      }),
    });
    return handleResponse(response);
  },

  // Verify email
  verifyEmail: async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/verifyEmail/${token}`, {
      method: "GET",
    });
    return handleResponse(response);
  },

  // Update password
  updatePassword: async (currentPassword, newPassword, passwordConfirm) => {
    const response = await fetch(`${API_BASE_URL}/auth/updatePassword`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword, passwordConfirm }),
    });
    return handleResponse(response);
  },

  // Get user balance
  getBalance: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/balance`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Add balance
  addBalance: async (amount) => {
    const response = await fetch(`${API_BASE_URL}/auth/balance/add`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleResponse(response);
  },

  // Deduct balance
  deductBalance: async (amount) => {
    const response = await fetch(`${API_BASE_URL}/auth/balance/deduct`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleResponse(response);
  },
};

// User management API calls
export const userAPI = {
  // Get current user profile
  getMe: async () => {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Update user profile
  updateMe: async (userData) => {
    const formData = new FormData();

    // Add text fields
    Object.keys(userData).forEach((key) => {
      if (key !== "avatar" && userData[key] !== undefined) {
        formData.append(key, userData[key]);
      }
    });

    // Add avatar file if present
    if (userData.avatar) {
      formData.append("avatar", userData.avatar);
    }

    const response = await fetch(`${API_BASE_URL}/users/updateMe`, {
      method: "PATCH",
      headers: {
        Authorization: getAuthHeaders().Authorization,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  // Delete user account
  deleteMe: async () => {
    const response = await fetch(`${API_BASE_URL}/users/deleteMe`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch(`${API_BASE_URL}/users/avatar/upload`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeaders().Authorization,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  // Delete avatar
  deleteAvatar: async () => {
    const response = await fetch(`${API_BASE_URL}/users/avatar`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get user balance
  getBalance: async () => {
    const response = await fetch(`${API_BASE_URL}/users/balance`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Add balance
  addBalance: async (amount) => {
    const response = await fetch(`${API_BASE_URL}/users/balance/add`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleResponse(response);
  },

  // Deduct balance
  deductBalance: async (amount) => {
    const response = await fetch(`${API_BASE_URL}/users/balance/deduct`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleResponse(response);
  },
};

// Admin API calls (if needed)
export const adminAPI = {
  // Get all users
  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get user stats
  getUserStats: async () => {
    const response = await fetch(`${API_BASE_URL}/users/stats`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get specific user
  getUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Update user
  updateUser: async (userId, userData) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // Delete user
  deleteUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Utility functions
export const authUtils = {
  // Set token in localStorage
  setToken: (token) => {
    localStorage.setItem("token", token);
  },

  // Get token from localStorage
  getToken: () => {
    return localStorage.getItem("token");
  },

  // Remove token from localStorage
  removeToken: () => {
    localStorage.removeItem("token");
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },

  // Get user data from localStorage
  getUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  // Set user data in localStorage
  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
  },

  // Remove user data from localStorage
  removeUser: () => {
    localStorage.removeItem("user");
  },

  // Clear all auth data
  clearAuth: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};

export default {
  authAPI,
  userAPI,
  adminAPI,
  authUtils,
};
