import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import authStorage from "./authStorage";

import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import TeacherLogin from "./pages/TeacherLogin";
import StudentLogin from "./pages/StudentLogin";
import StudentRegister from "./pages/StudentRegister";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import FaceRegistration from "./pages/FaceRegistration";
import FaceVerification from "./pages/FaceVerification";

function App() {
  useEffect(() => {
    document.body.classList.add("portal-app-body");

    const syncSession = () => {
      const token = authStorage.get("token");
      if (!token) return;

      if (!authStorage.isCurrentSessionActive()) {
        authStorage.clearSession({ broadcast: false });
        window.alert("This account was logged in from another tab. You have been logged out here.");
        window.location.href = "/";
      }
    };

    syncSession();

    const handleStorage = (event) => {
      if (event.key === "auth:activeSession" || event.key === "auth:event") {
        syncSession();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      document.body.classList.remove("portal-app-body");
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student-register" element={<StudentRegister />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/face-register" element={<FaceRegistration />} />
        <Route path="/face-verify" element={<FaceVerification />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
