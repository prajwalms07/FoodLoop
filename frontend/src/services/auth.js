import API from "./api";

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getStoredUser() {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser);
    if (user && typeof user === "object" && !Array.isArray(user)) {
      return user;
    }
  } catch {
    // Replace malformed persisted user data with the API response on session check.
  }

  localStorage.removeItem("user");
  return null;
}

function saveAuthSession(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.access_token !== "string" ||
    !payload.access_token ||
    !payload.user ||
    typeof payload.user !== "object"
  ) {
    return false;
  }

  localStorage.setItem("token", payload.access_token);
  localStorage.setItem("user", JSON.stringify(payload.user));
  return true;
}

export async function registerUser({ name, email, password, role, capacity }) {
  const body = {
    name,
    email,
    password,
    role,
  };
  if (role === "ngo" && capacity !== "") {
    body.capacity = Number(capacity);
  }

  const response = await API.post("/auth/register", body);

  return response.data;
}

export async function loginUser({ email, password }) {
  const response = await API.post("/auth/login", { email, password });
  const payload = response.data;

  if (!saveAuthSession(payload)) {
    throw new Error(
      "The login response must include an access token and user profile.",
    );
  }

  return payload;
}

export function getAuthErrorMessage(error, fallbackMessage) {
  if (error.response) {
    const responseData = error.response.data;
    const message =
      responseData?.message ||
      responseData?.error ||
      responseData?.detail ||
      fallbackMessage;
    const details =
      responseData?.details && typeof responseData.details === "object"
        ? Object.entries(responseData.details)
            .map(([field, reason]) => `${field}: ${reason}`)
            .join("; ")
        : "";

    return details ? `${message} (${details})` : message;
  }

  if (error.request) {
    return "Could not reach the server. Check that the Flask backend is running and the API URL is correct.";
  }

  return error.message || fallbackMessage;
}
