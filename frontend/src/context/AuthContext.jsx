import { useEffect, useState } from "react";
import AuthContext from "./contextObject";
import API from "../services/api";
import {
  clearAuthSession,
  getAuthErrorMessage,
  getStoredUser,
  loginUser,
} from "../services/auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [isLoading, setIsLoading] = useState(
    () => Boolean(localStorage.getItem("token")),
  );
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      return undefined;
    }

    let isCurrent = true;
    API.get("/users/me")
      .then(({ data }) => {
        if (!data?.user || typeof data.user !== "object") {
          throw new Error("The server did not return the signed-in user.");
        }

        localStorage.setItem("user", JSON.stringify(data.user));
        if (isCurrent) {
          setUser(data.user);
          setSessionError("");
        }
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }

        if (error.response?.status === 401) {
          clearAuthSession();
          setUser(null);
        } else {
          setSessionError(
            getAuthErrorMessage(
              error,
              "Could not verify your saved session.",
            ),
          );
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const signIn = async (credentials) => {
    const payload = await loginUser(credentials);
    setUser(payload.user);
    setSessionError("");
    return payload;
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
    setSessionError("");
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, sessionError, signIn, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
