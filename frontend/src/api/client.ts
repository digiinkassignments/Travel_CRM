import axios from "axios";

// Central Axios instance. Every feature module should import this rather
// than calling axios directly, so token attachment and refresh-on-401 stay
// in one place.
export const apiClient = axios.create({ baseURL: "/api" });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 423 || error.response?.data?.code === "SUBSCRIPTION_LOCKED") {
      localStorage.setItem("subscriptionStatus", "LOCKED");
      if (typeof window !== "undefined" && window.location.pathname !== "/payment-renewal") {
        window.location.href = "/payment-renewal";
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      // Queue this request BEFORE kicking off (or waiting on) the refresh
      // call, not after. Previously, whichever request happened to be the
      // one that triggered the actual refresh call queued itself only
      // *after* `await`-ing the refresh — by which point the refresh's
      // own `pendingQueue.forEach(...)` had already run and cleared the
      // queue, so that request's promise was pushed into an
      // already-flushed array and never resolved, hanging forever. Every
      // 401'd request now goes through the same queue, resolved together
      // in one flush once the refresh completes.
      const retryPromise = new Promise((resolve) => {
        pendingQueue.push(() => resolve(apiClient(originalRequest)));
      });

      if (!isRefreshing) {
        isRefreshing = true;
        (async () => {
          try {
            const { data } = await axios.post("/api/auth/refresh", { refreshToken });
            localStorage.setItem("accessToken", data.data.accessToken);
            pendingQueue.forEach((resolve) => resolve());
            pendingQueue = [];
          } catch {
            pendingQueue = [];
            redirectToLogin();
          } finally {
            isRefreshing = false;
          }
        })();
      }

      return retryPromise;
    }

    return Promise.reject(error);
  }
);

function redirectToLogin() {
  // Read the role before clearing it, so an expired super-admin session
  // lands back on /admin/login rather than the client login page.
  const role = localStorage.getItem("role");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  window.location.href = role === "SUPER_ADMIN" ? "/admin/login" : "/login";
}
