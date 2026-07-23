import React, { useEffect, useRef, useState } from "react";
import API, { buildBackendUrl, getApiErrorMessage } from "../api";
import authStorage from "../authStorage";
import PortalLayout, { EmptyState, SectionCard, StatCard, StatusBadge } from "../components/PortalLayout";

const formatDateForDisplay = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
};

const isInternshipExpired = (internship) => {
  if (!internship?.deadline) return false;
  const deadline = new Date(internship.deadline);
  deadline.setHours(23, 59, 59, 999);
  return Date.now() > deadline.getTime();
};

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [internships, setInternships] = useState([]);
  const [myInternships, setMyInternships] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceSession, setAttendanceSession] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [targets, setTargets] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [myTeacher, setMyTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [targetSavingId, setTargetSavingId] = useState(null);
  const [attendanceMode, setAttendanceMode] = useState("present");
  const [absentReason, setAbsentReason] = useState("");
  const [absentProof, setAbsentProof] = useState(null);
  const [internshipProofs, setInternshipProofs] = useState({});
  const [documentPurpose, setDocumentPurpose] = useState("");
  const [newAchievement, setNewAchievement] = useState({ title: "", description: "", shareWithTeacher: false });
  const [resumeCheckForm, setResumeCheckForm] = useState({ jobDescription: "", resumeFile: null });
  const [resumeCheckResult, setResumeCheckResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraRequested, setCameraRequested] = useState(false);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "mark", label: "Mark Attendance", icon: "attendance" },
    { key: "attendance", label: "View Attendance", icon: "eye" },
    { key: "internships", label: "Internships", icon: "briefcase" },
    { key: "applications", label: "Applied Internships", icon: "file" },
    { key: "certificates", label: "Certificates", icon: "upload" },
    { key: "achievements", label: "Achievements", icon: "trophy" },
    { key: "targets", label: "Targets", icon: "target" },
    { key: "resume-check", label: "Resume Check", icon: "file" }
  ];

  useEffect(() => {
    const token = authStorage.get("token");
    const role = authStorage.get("role");
    // const faceVerified = authStorage.get("faceVerified");

    if (!token || role !== "student") {
      window.location.href = "/student-login";
      return;
    }
    // Face login is paused for now. Restore this block later to require face verification.
    // if (faceVerified !== "true") {
    //   window.location.href = "/face-verify";
    //   return;
    // }

    Promise.all([fetchAttendance(), fetchMyInternships(), fetchMyTeacher()]);
  }, []);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendance();
    } else if (activeTab === "mark") {
      fetchAttendanceSessionStatus();
      if (attendanceMode === "present" && cameraRequested) startCamera();
    } else if (activeTab === "internships") {
      Promise.all([fetchInternships(), fetchMyInternships()]);
    } else if (activeTab === "applications") {
      fetchMyInternships();
    } else if (activeTab === "achievements") {
      Promise.all([fetchAchievements(), fetchMyTeacher()]);
    } else if (activeTab === "certificates") {
      fetchCertificates();
    } else if (activeTab === "targets") {
      fetchTargets();
    }

    return () => stopCamera();
  }, [activeTab, attendanceMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      window.alert("Please allow camera permissions to mark attendance.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    setCameraRequested(false);
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const [attendanceRes, summaryRes] = await Promise.all([
        API.get("/student/attendance"),
        API.get("/student/attendance/summary")
      ]);
      setAttendance(attendanceRes.data || []);
      setAttendanceSummary(summaryRes.data || null);
      return attendanceRes.data || [];
    } catch (err) {
      setAttendance([]);
      setAttendanceSummary(null);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceSessionStatus = async () => {
    try {
      const res = await API.get("/student/attendance/session-status");
      setAttendanceSession(res.data || { active: false, session: null });
      return res.data || { active: false, session: null };
    } catch (err) {
      setAttendanceSession({ active: false, session: null });
      return { active: false, session: null };
    }
  };

  const fetchInternships = async () => {
    try {
      const res = await API.get("/student/internships");
      setInternships(res.data || []);
      return res.data || [];
    } catch (err) {
      setInternships([]);
      return [];
    }
  };

  const fetchMyInternships = async () => {
    try {
      const res = await API.get("/student/my-internships");
      setMyInternships(res.data || []);
      return res.data || [];
    } catch (err) {
      setMyInternships([]);
      return [];
    }
  };

  const fetchAchievements = async () => {
    try {
      const res = await API.get("/student/achievements");
      setAchievements(res.data || []);
      return res.data || [];
    } catch (err) {
      setAchievements([]);
      return [];
    }
  };

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const res = await API.get("/student/targets");
      setTargets(res.data || []);
      return res.data || [];
    } catch (err) {
      setTargets([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeacher = async () => {
    try {
      const res = await API.get("/student/my-teacher");
      setMyTeacher(res.data || null);
      return res.data || null;
    } catch (err) {
      setMyTeacher(null);
      return null;
    }
  };

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await API.get("/student/certificates");
      setDocuments(res.data || []);
      return res.data || [];
    } catch (err) {
      setDocuments([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleApplyInternship = async (internshipId) => {
    const proof = internshipProofs[internshipId];
    if (!proof) {
      window.alert("Upload a screenshot proof of successful internship submission first.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("internshipId", internshipId);
      formData.append("proof", proof);
      const res = await API.post("/student/internship/apply", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      window.alert(res.data?.message || "Proof submitted. Verification is processing.");
      setInternshipProofs((current) => {
        const next = { ...current };
        delete next[internshipId];
        return next;
      });
      await Promise.all([fetchInternships(), fetchMyInternships()]);
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Proof verification failed"));
    }
  };

  const handleWithdrawInternship = async (internshipId) => {
    try {
      await API.post("/student/internship/withdraw", { internshipId });
      window.alert("Application withdrawn!");
      await Promise.all([fetchInternships(), fetchMyInternships()]);
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error withdrawing application"));
    }
  };

  const handleUploadCertificate = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!documentPurpose.trim()) {
      window.alert("Please enter the document purpose before uploading.");
      event.target.value = "";
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", documentPurpose.trim());
      await API.post("/student/certificate", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      window.alert("Document uploaded!");
      setDocumentPurpose("");
      event.target.value = "";
      fetchCertificates();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error uploading document"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCertificate = async (certificateId) => {
    if (!window.confirm("Do you want to delete this document?")) return;

    try {
      setLoading(true);
      await API.delete(`/student/certificate/${certificateId}`);
      window.alert("Document deleted.");
      fetchCertificates();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error deleting document"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddAchievement = async (event) => {
    event.preventDefault();
    if (!newAchievement.title) {
      window.alert("Please enter an achievement title");
      return;
    }

    try {
      await API.post("/student/achievement", newAchievement);
      window.alert("Achievement added!");
      setNewAchievement({ title: "", description: "", shareWithTeacher: false });
      fetchAchievements();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error adding achievement"));
    }
  };

  const handleTargetStatusChange = async (targetId, status) => {
    try {
      setTargetSavingId(targetId);
      const res = await API.patch(`/student/target/${targetId}/status`, { status });
      const updatedTarget = res.data?.target;

      setTargets((current) => current.map((target) => (
        target._id === targetId
          ? { ...target, ...updatedTarget }
          : target
      )));
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error updating target status"));
    } finally {
      setTargetSavingId(null);
    }
  };

  const handleShareAchievement = async (achievementId) => {
    try {
      await API.post(`/student/achievement/${achievementId}/share`);
      window.alert("Achievement shared with teacher!");
      fetchAchievements();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error sharing achievement"));
    }
  };

  const handleMarkPresent = async () => {
    if (!attendanceSession?.active) {
      window.alert("Attendance is not active for your department and year right now.");
      return;
    }
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL("image/jpeg");

    try {
      setLoading(true);
      const username = authStorage.get("username");
      const { data: faceData } = await API.post("/auth/face/verify", { username, image: imageBase64 });

      if (!faceData.match) {
        window.alert(`Face not recognized: ${faceData.error || "Please try again."}`);
        setLoading(false);
        return;
      }

      await API.post("/student/attendance", {
        status: "present",
        location: "Campus",
        faceImage: faceData.proof
      });

      window.alert("Attendance Marked as Present!");
      setActiveTab("attendance");
      fetchAttendance();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error marking attendance"));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAbsent = async (event) => {
    event.preventDefault();
    if (!attendanceSession?.active) {
      window.alert("Attendance is not active for your department and year right now.");
      return;
    }
    if (!absentReason) {
      window.alert("Provide a reason for leave");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("status", "absent");
      formData.append("purpose", absentReason);
      if (absentProof) formData.append("imageProof", absentProof);
      await API.post("/student/attendance", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      window.alert("Absent request submitted to teacher for approval.");
      setAbsentReason("");
      setAbsentProof(null);
      setActiveTab("attendance");
      fetchAttendance();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error submitting absence"));
    } finally {
      setLoading(false);
    }
  };

  const handleResumeCheck = async (event) => {
    event.preventDefault();
    if (!resumeCheckForm.jobDescription.trim() || !resumeCheckForm.resumeFile) {
      window.alert("Enter the job description and upload your resume PDF.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("jobDescription", resumeCheckForm.jobDescription);
      formData.append("resume", resumeCheckForm.resumeFile);
      const res = await API.post("/student/resume-check", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResumeCheckResult(res.data);
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error checking resume"));
    } finally {
      setLoading(false);
    }
  };

  const displayName = authStorage.get("displayName") || authStorage.get("username") || "Student";
  const appliedInternships = myInternships.filter((entry) => entry.applied);

  return (
    <PortalLayout
      portalTitle="Student Portal"
      portalSubtitle={displayName}
      headerTitle={activeTab === "dashboard" ? `Welcome, ${displayName}` : navItems.find((item) => item.key === activeTab)?.label || "Student Portal"}
      navItems={navItems}
      activeKey={activeTab}
      onSelect={setActiveTab}
      onLogout={() => {
        stopCamera();
        authStorage.clearSession();
        window.location.href = "/";
      }}
    >
      {activeTab === "dashboard" ? (
        <>
          <div className="portal-card-grid">
            <StatCard label="Days Present" value={attendanceSummary?.present ?? 0} tone="success" />
            <StatCard label="Days Absent" value={attendanceSummary?.absent ?? 0} tone="danger" />
            <StatCard label="Internships Applied" value={appliedInternships.length} />
          </div>

          <SectionCard>
            <div className="portal-metadata">
              <p className="portal-panel-note">
                Teacher: <strong>{myTeacher?.name || "Not assigned"}</strong>
              </p>
              <p className="portal-panel-note">
                Roll No: <strong>{authStorage.get("username") || "-"}</strong>
              </p>
            </div>
          </SectionCard>
        </>
      ) : null}

      {activeTab === "mark" ? (
        <div className="portal-split">
          <SectionCard title="Mark Present" subtitle="Capture your face to mark present">
            {attendanceSession?.active ? (
              <div className="portal-camera">
                <div className="portal-camera-copy">
                  <h3>Face Verification</h3>
                  <p>Look at the camera</p>
                </div>

                <div className="portal-camera-frame">
                  {!cameraRequested ? (
                    <button
                      type="button"
                      className="portal-button"
                      onClick={() => {
                        setAttendanceMode("present");
                        setCameraRequested(true);
                        startCamera();
                      }}
                    >
                      Start Camera
                    </button>
                  ) : (
                    <video ref={videoRef} autoPlay playsInline />
                  )}
                </div>

                <canvas ref={canvasRef} width="400" height="300" style={{ display: "none" }} />

                {cameraRequested ? (
                  <div className="portal-button-row">
                    <button type="button" className="portal-button" disabled={!streamActive || loading} onClick={handleMarkPresent}>
                      {loading ? "Verifying Face..." : "Capture and Mark Present"}
                    </button>
                    <button type="button" className="portal-button-secondary" disabled={!streamActive || loading} onClick={stopCamera}>
                      Turn Off Camera
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="portal-banner">
                Attendance is not active for your department and year right now.
              </div>
            )}
          </SectionCard>

          <SectionCard title="Request Absent">
            <form className="portal-form-grid" onSubmit={handleMarkAbsent}>
              <div className="portal-field">
                <label htmlFor="absence-reason">Reason for absence</label>
                <textarea
                  id="absence-reason"
                  className="portal-textarea"
                  placeholder="Explain your reason..."
                  value={absentReason}
                  onChange={(event) => setAbsentReason(event.target.value)}
                  required
                />
              </div>

              <div className="portal-button-row">
                <input
                  className="portal-file"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setAbsentProof(event.target.files[0] || null)}
                />
                <button type="submit" className="portal-button-danger" disabled={loading}>
                  {loading ? "Submitting..." : "Request Permission"}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "attendance" ? (
        <SectionCard title="Your Attendance Record">
          {loading ? (
            <EmptyState text="Loading..." />
          ) : attendance.length === 0 ? (
            <EmptyState text="No records." />
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hour</th>
                    <th>Status</th>
                    <th>Teacher Permission</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record._id}>
                      <td>{record.date}</td>
                      <td>{record.hour}:00</td>
                      <td>{record.status} {record.purpose ? `(${record.purpose})` : ""}</td>
                      <td>{record.permissionStatus || "none"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "internships" ? (
        <SectionCard title="Available Internships">
          {loading ? (
            <EmptyState text="Loading..." />
          ) : internships.length === 0 ? (
            <EmptyState text="No internships available." />
          ) : (
            <div className="portal-simple-list">
              {internships.map((internship) => {
                const myApplication = myInternships.find((item) => item.internship?._id === internship._id);
                const deadlineOver = isInternshipExpired(internship);
                const hasApplied = !deadlineOver && myApplication?.applied;
                const proofStatus = myApplication?.proofVerificationStatus || "not_checked";
                const proofProcessing = proofStatus === "processing";
                const proofWasRejected = proofStatus === "rejected" || proofStatus === "error";
                const proofStatusLabel = hasApplied
                  ? "Verified proof"
                  : proofProcessing
                    ? "Verification processing"
                    : proofWasRejected
                      ? "Proof not verified"
                      : "Proof not submitted";
                const proofStatusTone = hasApplied ? "success" : proofProcessing ? "warning" : proofWasRejected ? "danger" : "neutral";
                return (
                  <div key={internship._id} className="portal-link-card">
                    <h4>{internship.title}</h4>
                    <p>By: {internship.teacher?.name || "Unknown teacher"}</p>
                    {internship.deadline ? <p>Deadline: {formatDateForDisplay(internship.deadline)}</p> : null}
                    <p>Status: <strong>{hasApplied ? "Applied" : proofProcessing ? "Verification Processing" : "Not Applied"}</strong></p>
                    {proofProcessing ? <p>Proof submitted. Please refresh after a short time to see final verification.</p> : null}
                    {!hasApplied && proofWasRejected ? <p>Last proof check: Not verified.</p> : null}
                    {deadlineOver ? <p>The deadline is over.</p> : null}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                      <StatusBadge tone={proofStatusTone}>{proofStatusLabel}</StatusBadge>
                    </div>
                    {proofWasRejected ? <p className="portal-panel-note">Upload the correct successful submission screenshot for this internship.</p> : null}
                    <div className="portal-button-row" style={{ marginTop: 14 }}>
                      <a className="portal-link-button" href={internship.url} target="_blank" rel="noreferrer">
                        Visit Internship Page
                      </a>
                      {hasApplied ? (
                        <button type="button" className="portal-button-danger" onClick={() => handleWithdrawInternship(internship._id)}>
                          Withdraw
                        </button>
                      ) : (
                        <>
                          <input
                            className="portal-file"
                            type="file"
                            accept="image/*"
                            disabled={deadlineOver || proofProcessing}
                            onChange={(event) => setInternshipProofs((current) => ({
                              ...current,
                              [internship._id]: event.target.files[0] || null
                            }))}
                          />
                          <button type="button" className="portal-button" disabled={deadlineOver || proofProcessing} onClick={() => handleApplyInternship(internship._id)}>
                            {deadlineOver ? "Deadline Over" : proofProcessing ? "Verification Processing" : "Submit Proof"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "applications" ? (
        <SectionCard title="Applied Internships">
          {appliedInternships.length === 0 ? (
            <EmptyState text="You have not applied to any internships yet." />
          ) : (
            <div className="portal-simple-list">
              {appliedInternships.map((application) => (
                <div key={application._id} className="portal-simple-list-item">
                  <h4>{application.internship?.title || "Internship"}</h4>
                  <p>Applied on: {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : "Recently"}</p>
                  <StatusBadge tone="success">Applied</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "achievements" ? (
        <div className="portal-split">
          <SectionCard title="Add New Achievement">
            <form className="portal-form-grid" onSubmit={handleAddAchievement}>
              <input
                className="portal-input"
                type="text"
                placeholder="Achievement Title"
                value={newAchievement.title}
                onChange={(event) => setNewAchievement((current) => ({ ...current, title: event.target.value }))}
              />

              <textarea
                className="portal-textarea"
                rows="4"
                placeholder="Description (optional)"
                value={newAchievement.description}
                onChange={(event) => setNewAchievement((current) => ({ ...current, description: event.target.value }))}
              />

              <label className="portal-checkbox-row">
                <input
                  type="checkbox"
                  checked={newAchievement.shareWithTeacher}
                  onChange={(event) => setNewAchievement((current) => ({
                    ...current,
                    shareWithTeacher: event.target.checked
                  }))}
                />
                <span>Share with my teacher ({myTeacher?.name || "No teacher assigned"})</span>
              </label>

              <div className="portal-button-row">
                <button type="submit" className="portal-button">Add Achievement</button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="My Achievements">
            {achievements.length === 0 ? (
              <EmptyState text="No achievements yet." />
            ) : (
              <div className="portal-simple-list">
                {achievements.map((achievement) => (
                  <div key={achievement._id} className="portal-simple-list-item">
                    <h4>{achievement.title}</h4>
                    <p>{achievement.description || "No description added."}</p>
                    <p>By: {achievement.teacher?.name || "Not assigned"}</p>
                    <div className="portal-button-row" style={{ marginTop: 12 }}>
                      {achievement.shared ? (
                        <StatusBadge tone="success">Shared with teacher</StatusBadge>
                      ) : myTeacher ? (
                        <button type="button" className="portal-button" onClick={() => handleShareAchievement(achievement._id)}>
                          Share
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "certificates" ? (
        <div className="portal-split">
          <SectionCard title="Upload New Document">
            <div className="portal-form-grid">
              <input
                className="portal-input"
                type="text"
                placeholder="Purpose of this document"
                value={documentPurpose}
                onChange={(event) => setDocumentPurpose(event.target.value)}
              />
              <input
                className="portal-file"
                type="file"
                onChange={handleUploadCertificate}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </div>
          </SectionCard>

          <SectionCard title="Your Uploaded Documents">
            {loading ? (
              <EmptyState text="Loading..." />
            ) : documents.length === 0 ? (
              <EmptyState text="No documents uploaded yet." />
            ) : (
              <div className="portal-detail-list">
                {documents.map((document) => (
                  <div key={document._id} className="portal-document-row">
                    <div>
                      <h4>{document.originalName}</h4>
                      <p>Purpose: {document.purpose || document.title || "Not specified"}</p>
                      <p>Uploaded: {new Date(document.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="portal-button-row">
                      <a className="portal-link-button" href={buildBackendUrl(document.fileName)} target="_blank" rel="noreferrer">
                        View
                      </a>
                      <button type="button" className="portal-button-danger" onClick={() => handleDeleteCertificate(document._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "targets" ? (
        <SectionCard
          title="Targets"
          subtitle="Update each task with your current progress so your teacher can track completion."
          className="student-targets-section"
        >
          {loading ? (
            <EmptyState text="Loading targets..." />
          ) : targets.length === 0 ? (
            <EmptyState text="No targets available yet." />
          ) : (
            <div className="portal-simple-list">
              {targets.map((target) => (
                <div key={target._id} className="student-target-card">
                  <div className="student-target-card-head">
                    <div>
                      <h4>&bull; {target.title}</h4>
                      <p>
                        Assigned by {target.teacher?.name || "Teacher"}
                        {" • "}
                        {new Date(target.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        target.status === "completed"
                          ? "success"
                          : target.status === "ongoing"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {target.status === "completed" ? "Completed" : target.status === "ongoing" ? "Ongoing" : "Not Started"}
                    </StatusBadge>
                  </div>

                  <div className="student-target-status-row">
                    {[
                      { value: "not_started", label: "Not Started", className: "not-started" },
                      { value: "ongoing", label: "Ongoing", className: "ongoing" },
                      { value: "completed", label: "Completed", className: "completed" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`student-target-status-button ${option.className}${target.status === option.value ? " active" : ""}`}
                        onClick={() => handleTargetStatusChange(target._id, option.value)}
                        disabled={targetSavingId === target._id}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "resume-check" ? (
        <div className="portal-split">
          <SectionCard
            title="Resume Check"
            subtitle="Paste a job description and upload your resume PDF to find relevant missing keywords."
          >
            <form className="portal-form-grid" onSubmit={handleResumeCheck}>
              <div className="portal-field">
                <label htmlFor="resume-job-description">Job Description</label>
                <textarea
                  id="resume-job-description"
                  className="portal-textarea"
                  rows="9"
                  placeholder="Paste the complete job description..."
                  value={resumeCheckForm.jobDescription}
                  onChange={(event) => setResumeCheckForm((current) => ({ ...current, jobDescription: event.target.value }))}
                />
              </div>

              <div className="portal-field">
                <label htmlFor="resume-file">Resume PDF</label>
                <input
                  id="resume-file"
                  className="portal-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setResumeCheckForm((current) => ({
                    ...current,
                    resumeFile: event.target.files[0] || null
                  }))}
                />
                <p className="portal-panel-note">
                  Upload a readable text-based PDF. Scanned image PDFs may not extract text correctly.
                </p>
              </div>

              <div className="portal-button-row">
                <button type="submit" className="portal-button" disabled={loading}>
                  {loading ? "Checking..." : "Generate Suggestions"}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Suggestions">
            {!resumeCheckResult ? (
              <EmptyState text="Submit a job description and resume to see suggestions." />
            ) : resumeCheckResult.status === "invalid_input" ? (
              <div className="portal-simple-list">
                <div className="portal-banner">{resumeCheckResult.message}</div>
                <p className="portal-panel-note">{resumeCheckResult.verification?.reason}</p>
              </div>
            ) : (
              <div className="portal-simple-list">
                <div className="portal-simple-list-item">
                  <h4>Shortlisting Keywords</h4>
                  {resumeCheckResult.suggestions?.length > 0 ? (
                    <div className="portal-button-row">
                      {resumeCheckResult.suggestions.map((keyword) => (
                        <StatusBadge key={keyword} tone="success">{keyword}</StatusBadge>
                      ))}
                    </div>
                  ) : (
                    <p>No verified missing keywords found.</p>
                  )}
                </div>

                <div className="portal-simple-list-item">
                  <h4>Already Present</h4>
                  <p>{resumeCheckResult.alreadyPresentKeywords?.join(", ") || "No strong matches found."}</p>
                </div>

                <div className="portal-simple-list-item">
                  <h4>Reverification</h4>
                  <StatusBadge tone={resumeCheckResult.verification?.valid ? "success" : "warning"}>
                    {resumeCheckResult.verification?.valid ? "Verified" : "Review Needed"}
                  </StatusBadge>
                  <p>{resumeCheckResult.verification?.reason}</p>
                  <p>Match score: {Math.round((resumeCheckResult.overlapScore || 0) * 100)}%</p>
                </div>

                {resumeCheckResult.unrelatedResumeTerms?.length > 0 ? (
                  <div className="portal-simple-list-item">
                    <h4>Resume Terms Less Related to This JD</h4>
                    <p>{resumeCheckResult.unrelatedResumeTerms.join(", ")}</p>
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}
    </PortalLayout>
  );
}

export default StudentDashboard;
