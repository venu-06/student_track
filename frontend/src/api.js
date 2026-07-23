import axios from "axios";
import authStorage from "./authStorage";

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";
export const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
export const FLASK_BASE_URL = process.env.REACT_APP_FLASK_BASE_URL || "http://localhost:8000";

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(process.env.REACT_APP_API_TIMEOUT_MS || 60000)
});

export const buildBackendUrl = (path = "") => {
  if (!path) return BACKEND_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BACKEND_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export const buildFlaskUrl = (path = "") => {
  if (!path) return FLASK_BASE_URL;
  return `${FLASK_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export const getApiErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error) return fallback;

  if (error.response?.data?.error) return error.response.data.error;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;

  return fallback;
};

// Request interceptor
API.interceptors.request.use((req) => {
  const token = authStorage.get("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  console.log("Request:", req.method?.toUpperCase(), req.url);
  return req;
});

// Response interceptor
API.interceptors.response.use(
  (res) => {
    console.log("Response:", res.status, res.data);
    return res;
  },
  (err) => {
    console.error("API Error:", err.response?.status, err.response?.data || err.message);
    if (err.response?.status === 401 || err.response?.status === 403) {
      authStorage.clearSession();
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default API;
