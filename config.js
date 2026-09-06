/**
 * Dynamic configuration for RPG Game Frontend.
 * When running locally, connects to localhost:8000.
 * In production / PaaS, replace YOUR_USECTL_BACKEND_APP with your deployed usectl backend app name.
 */
window.APP_CONFIG = {
  API_BASE: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000/api"
    : "https://YOUR_USECTL_BACKEND_APP.usectl.app/api"
};
