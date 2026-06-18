import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { getApiErrorMessage } from "../api";
import authStorage from "../authStorage";
import { PortalIcon } from "../components/PortalLayout";
import "../styles/Portal.css";

function FaceRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const token = authStorage.get("token");
    const role = authStorage.get("role");
    const loginCount = authStorage.get("loginCount");

    if (!token) {
      navigate("/");
      return;
    }

    if (loginCount !== "0" && loginCount !== 0) {
      if (role === "teacher") navigate("/teacher");
      else if (role === "student") navigate("/student");
      else navigate("/");
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [navigate]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      window.alert("Please allow camera access to register your face.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const captureAndRegister = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL("image/jpeg");
    const username = authStorage.get("username");

    try {
      setLoading(true);

      const { data } = await API.post("/auth/face/register", { username, image: imageBase64 });
      if (!data.success) {
        window.alert(`Face Registration Failed: ${data.error || "Unable to register face"}`);
        return;
      }

      await API.post("/auth/update-login-count");

      authStorage.set("loginCount", 1);
      authStorage.set("faceVerified", "false");

      window.alert("Face registered successfully. Please verify once to continue.");

      stopCamera();
      navigate("/face-verify");
    } catch (err) {
      window.alert(getApiErrorMessage(err, "An error occurred during registration."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-auth-shell">
      <div className="portal-auth-card portal-face-card">
        <div className="portal-auth-title">
          <div className="portal-auth-icon">
            <PortalIcon name="shield" />
          </div>
          <h1>Face Registration</h1>
        </div>

        <p className="portal-auth-footnote">
          Please look directly at the camera. Ensure you are in a well-lit room without glasses or hats blocking your face.
        </p>

        <div className="portal-face-stage">
          <div className="portal-camera-frame portal-face-frame">
            <video ref={videoRef} autoPlay playsInline width="480" height="360" />
            <div className="portal-scan-line" />
            <canvas ref={canvasRef} width="480" height="360" style={{ display: "none" }} />
          </div>
        </div>

        <div className="portal-button-row portal-face-actions">
          <button
            type="button"
            className="portal-button"
            onClick={captureAndRegister}
            disabled={!streamActive || loading}
          >
            {loading ? "Processing..." : "Capture & Register Profile"}
          </button>
        </div>

        <div className="portal-banner">
          Your registered face is saved for future login verification and attendance checks.
        </div>
      </div>
    </div>
  );
}

export default FaceRegistration;
