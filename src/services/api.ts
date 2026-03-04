import axios from "axios";

export const api = axios.create({
  baseURL: "http://72.60.54.232:8579",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cdf_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});