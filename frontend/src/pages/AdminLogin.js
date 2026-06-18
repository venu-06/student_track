import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import authStorage from "../authStorage";
import { PortalIcon } from "../components/PortalLayout";
import "../styles/Portal.css";

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      setError("");
      authStorage.clearSession();

      if (!username || !password) {
        setError("Please enter all fields");
        return;
      }

      setLoading(true);
      const res = await API.post("/auth/login", { username, password });

      if (res.data.role !== "admin") {
        setError("Invalid admin credentials");
        return;
      }

      authStorage.beginSession({ role: res.data.role, username: res.data.username || username });
      authStorage.set("token", res.data.token);
      authStorage.set("role", res.data.role);
      authStorage.set("username", res.data.username || username);
      authStorage.set("displayName", res.data.name || "Administrator");
      window.location.href = "/admin";
    } catch (err) {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-auth-shell">
      <div className="portal-auth-card">
        <button type="button" className="portal-auth-back" onClick={() => navigate("/")}>
          <PortalIcon name="home" />
          <span>Back to role selection</span>
        </button>

        <div className="portal-auth-title">
          <div className="portal-auth-icon">
            <PortalIcon name="shield" />
          </div>
          <h1>Admin Login</h1>
        </div>

        <form className="portal-form-grid" onSubmit={handleLogin}>
          <div className="portal-field">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              className="portal-input"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="portal-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              className="portal-input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
          </div>

          {error ? <div className="portal-auth-error">{error}</div> : null}

          <button type="submit" disabled={loading} className="portal-button">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
