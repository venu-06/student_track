import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import authStorage from "../authStorage";
import { PortalIcon } from "../components/PortalLayout";
import "../styles/Portal.css";

function StudentLogin() {
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

      if (res.data.role !== "student") {
        setError("Invalid student credentials");
        return;
      }

      authStorage.beginSession({ role: res.data.role, username: res.data.username || username });
      authStorage.set("token", res.data.token);
      authStorage.set("role", res.data.role);
      authStorage.set("loginCount", res.data.loginCount);
      authStorage.set("username", res.data.username || username);
      authStorage.set("displayName", res.data.name || res.data.username || username);
      // authStorage.set("faceVerified", "false");

      // Face login is paused for now. Restore this block later to require face registration/verification.
      // if (res.data.loginCount === 0) {
      //   window.location.href = "/face-register";
      // } else {
      //   window.location.href = "/face-verify";
      // }
      window.location.href = "/student";
    } catch (err) {
      setError(err.response?.data?.message || "Invalid roll number or password");
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
            <PortalIcon name="graduation" />
          </div>
          <h1>Student Login</h1>
        </div>

        <form className="portal-form-grid" onSubmit={handleLogin}>
          <div className="portal-field">
            <label htmlFor="student-username">Roll Number</label>
            <input
              id="student-username"
              className="portal-input"
              type="text"
              placeholder="Enter roll number"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="portal-field">
            <label htmlFor="student-password">Password</label>
            <input
              id="student-password"
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

export default StudentLogin;
