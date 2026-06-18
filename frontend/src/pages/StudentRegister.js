import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/StudentLogin.css";
import "../styles/FaceSetup.css";

function StudentRegister() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      setError("Camera access denied");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  React.useEffect(() => () => stopCamera(), []);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Enter username and password");
      return;
    }
    setLoading(true);
    try {
      const imageData = takePhoto();
      const payload = { username, password, role: "student", imageData };
      await API.post("/auth/register", payload);
      alert("Registered successfully. Please login.");
      stopCamera();
      navigate("/student-login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    stopCamera();
    navigate("/student-login");
  };

  return (
    <div className="auth-shell student-login-wrapper register-theme">
      <div className="auth-stage student-login-container">
        <div className="auth-grid">
          <section className="auth-aside">
            <div className="login-badge">RG</div>
            <span className="auth-kicker">First-time setup</span>
            <h1>Create your account and capture your face sample once.</h1>
            <p>This registration step prepares the student account for future attendance verification and login checks.</p>
            <div className="auth-highlights">
              <div>
                <strong>Secure enrollment</strong>
                <span>Add your credentials and register a face sample for later verification.</span>
              </div>
              <div>
                <strong>Faster next login</strong>
                <span>After setup, future sessions can move directly into the verification flow.</span>
              </div>
            </div>
          </section>

          <div className="auth-card student-login-box">
            <div className="auth-card-header">
              <span className="auth-card-label">Student registration</span>
              <h2>Register Account</h2>
              <p>Enter your details, start the camera, and capture a clear face sample.</p>
            </div>

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Roll Number</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="form-group register-camera-group">
                <label>Face Registration Camera</label>
                <div className="video-container register-video-frame">
                  <video ref={videoRef} autoPlay playsInline width="240" height="180" className="video-feed register-video-feed" />
                  {videoRef.current?.srcObject && <div className="scanning-animation register-scan"></div>}
                </div>
                <canvas ref={canvasRef} style={{ display: "none" }} />

                <div className="register-camera-actions">
                  <button type="button" onClick={startCamera} className="secondary-action-button">Start Camera</button>
                  <button type="button" onClick={takePhoto} className="camera-action-button">Take Photo</button>
                </div>
              </div>

              {error && <div className="error-box">{error}</div>}

              <button type="submit" disabled={loading} className="login-btn">
                {loading ? "Registering..." : "Register"}
              </button>
            </form>

            <button onClick={handleBackToLogin} className="secondary-action-button" type="button">
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentRegister;
