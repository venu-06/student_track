import React from "react";
import { useNavigate } from "react-router-dom";
import { PortalIcon } from "../components/PortalLayout";
import "../styles/Portal.css";

function Landing() {
  const navigate = useNavigate();

  const roles = [
    { key: "admin", label: "Admin", icon: "shield", color: "#2563eb", route: "/admin-login" },
    { key: "teacher", label: "Teacher", icon: "book", color: "#28b457", route: "/teacher-login" },
    { key: "student", label: "Student", icon: "graduation", color: "#22a6f2", route: "/student-login" }
  ];

  return (
    <div className="portal-hero-shell">
      <div className="portal-hero-content">
        <h1>Attendance System</h1>
        <p>Select your role to continue</p>

        <div className="portal-role-grid">
          {
            roles.map((role) => (
              <div
                key={role.key}
                className="portal-role-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(role.route)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    navigate(role.route);
                  }
                }}
              >
                <div className="portal-role-icon" style={{ background: role.color }}>
                  <PortalIcon name={role.icon} />
                </div>
                <h3>{role.label}</h3>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default Landing;
