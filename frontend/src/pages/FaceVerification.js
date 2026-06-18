import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { getApiErrorMessage } from "../api";
import authStorage from "../authStorage";
import "../styles/FaceSetup.css";

function FaceVerification() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const role = authStorage.get("role");

  useEffect(() => {
    const token = authStorage.get("token");
    const currentRole = authStorage.get("role");
    const loginCount = authStorage.get("loginCount");

    if (!token || (currentRole !== "teacher" && currentRole !== "student")) {
      navigate("/");
      return;
    }

    if (loginCount === "0" || loginCount === 0) {
      navigate("/face-register");
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
      console.error("Camera access denied", err);
      alert("Please allow camera access to verify your face.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL("image/jpeg");
    const username = authStorage.get("username");

    try {
      setLoading(true);

      const { data } = await API.post("/auth/face/verify", { username, image: imageBase64 });
      if (!data.match) {
        alert("Face Verification Failed: " + (data.error || "No match found"));
        return;
      }

      authStorage.set("faceVerified", "true");
      stopCamera();
      navigate(role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      alert(getApiErrorMessage(err, "An error occurred during verification."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="face-setup-wrapper verify-theme">
      <div className="face-setup-container">
        <h2>{role === "teacher" ? "Teacher Face Verification" : "Student Face Verification"}</h2>
        <p>Security check: please verify your registered face to access the portal.</p>

        <div className="video-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            width="480"
            height="360"
            className="video-feed"
          />
          <div className="scanning-animation"></div>
          <canvas ref={canvasRef} width="480" height="360" style={{ display: "none" }} />
        </div>

        <button
          onClick={captureAndVerify}
          disabled={!streamActive || loading}
          className="btn-capture"
        >
          {loading ? "Verifying..." : "Verify Face & Login"}
        </button>
      </div>
    </div>
  );
}

export default FaceVerification;
