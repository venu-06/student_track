import React, { useEffect, useState } from "react";
import API, { buildBackendUrl, getApiErrorMessage } from "../api";
import authStorage from "../authStorage";
import PortalLayout, { EmptyState, SectionCard, StatCard, StatusBadge } from "../components/PortalLayout";

const formatTargetStatusLabel = (status) => {
  if (status === "completed") return "Completed";
  if (status === "ongoing") return "Ongoing";
  return "Not Started";
};

const formatDateForInput = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
};

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [internships, setInternships] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [attendanceFilters, setAttendanceFilters] = useState({ departments: [], yearsByDepartment: {} });
  const [permissions, setPermissions] = useState([]);
  const [studentAchievements, setStudentAchievements] = useState([]);
  const [teacherTargets, setTeacherTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInternships, setSelectedInternships] = useState([]);
  const [teacherFilter, setTeacherFilter] = useState({ department: "", year: "" });
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    internshipDeadline: "",
    achievement: "",
    selectedStudent: "",
    achievementDesc: "",
    targetText: "",
    attendanceDepartment: "",
    attendanceYear: ""
  });
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [internshipStatsById, setInternshipStatsById] = useState({});
  const [expandedTargetId, setExpandedTargetId] = useState(null);
  const attendanceDepartments = attendanceFilters.departments || [];
  const attendanceYears = formData.attendanceDepartment
    ? (attendanceFilters.yearsByDepartment?.[formData.attendanceDepartment] || [])
    : [];
  const teacherFilterYears = teacherFilter.department
    ? (attendanceFilters.yearsByDepartment?.[teacherFilter.department] || [])
    : [];
  const teacherFilterParams = {
    department: teacherFilter.department,
    year: teacherFilter.year
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "attendance", label: "Mark Attendance", icon: "attendance" },
    { key: "attendance-statistics", label: "View Attendance", icon: "eye" },
    { key: "permissions", label: "Permissions", icon: "shield" },
    { key: "internships", label: "Internships", icon: "briefcase" },
    { key: "targets", label: "Student Targets", icon: "target" },
    { key: "student-achievements", label: "Student Achievements", icon: "trophy" },
    { key: "report", label: "Send Report", icon: "send" }
  ];

  useEffect(() => {
    const role = authStorage.get("role");
    // const faceVerified = authStorage.get("faceVerified");
    const token = authStorage.get("token");

    if (!token || role !== "teacher") {
      window.location.href = "/teacher-login";
      return;
    }
    // Face login is paused for now. Restore this block later to require face verification.
    // if (faceVerified !== "true") {
    //   window.location.href = "/face-verify";
    //   return;
    // }

    Promise.all([fetchAttendanceFilters(), fetchMyStudents(), fetchInternships(), fetchPermissions(), fetchAttendanceSessions()]);
  }, []);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendance();
      fetchAttendanceSessions();
    } else if (activeTab === "attendance-statistics") {
      fetchAttendanceStatistics();
    } else if (activeTab === "internships") {
      fetchInternships();
    } else if (activeTab === "student-achievements") {
      fetchStudentAchievements();
    } else if (activeTab === "permissions") {
      fetchPermissions();
    } else if (activeTab === "targets") {
      fetchTargetStats();
    } else if (activeTab === "report") {
      fetchInternships();
    }
  }, [activeTab, students.length, teacherFilter.department, teacherFilter.year]);

  useEffect(() => {
    setSelectedInternship(null);
    setInternshipStatsById({});
    setSelectedInternships([]);
    setFormData((current) => ({
      ...current,
      selectedStudent: "",
      attendanceDepartment: teacherFilter.department,
      attendanceYear: teacherFilter.year
    }));
    fetchMyStudents();
  }, [teacherFilter.department, teacherFilter.year]);

  const fetchMyStudents = async () => {
    try {
      const res = await API.get("/teacher/my-students", { params: teacherFilterParams });
      const studentList = res.data || [];
      setStudents(studentList);
      return studentList;
    } catch (err) {
      setStudents([]);
      return [];
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await API.get("/teacher/permissions", { params: teacherFilterParams });
      setPermissions(res.data || []);
      return res.data || [];
    } catch (err) {
      setPermissions([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const grantPermission = async (id, status) => {
    try {
      await API.patch("/teacher/permission", { permissionId: id, status });
      window.alert(`Permission ${status}`);
      fetchPermissions();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Failed to update permission"));
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await API.get("/teacher/attendance", { params: teacherFilterParams });
      setAttendance(res.data || []);
    } catch (err) {
      setAttendance([]);
      window.alert(getApiErrorMessage(err, "Error fetching attendance"));
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStatistics = async () => {
    try {
      setLoading(true);
      const res = await API.get("/teacher/attendance/statistics", { params: teacherFilterParams });
      setAttendanceStats(res.data || []);
    } catch (err) {
      setAttendanceStats([]);
      window.alert(getApiErrorMessage(err, "Error fetching attendance statistics"));
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceSessions = async () => {
    try {
      const res = await API.get("/teacher/attendance/sessions");
      setAttendanceSessions(res.data || []);
      return res.data || [];
    } catch (err) {
      setAttendanceSessions([]);
      return [];
    }
  };

  const fetchAttendanceFilters = async () => {
    try {
      const res = await API.get("/teacher/attendance/filters");
      setAttendanceFilters(res.data || { departments: [], yearsByDepartment: {} });
    } catch (err) {
      setAttendanceFilters({ departments: [], yearsByDepartment: {} });
      window.alert(getApiErrorMessage(err, "Error fetching attendance filters"));
    }
  };

  const fetchInternships = async () => {
    try {
      setLoading(true);
      const res = await API.get("/teacher/internships", { params: teacherFilterParams });
      setInternships(res.data || []);
      return res.data || [];
    } catch (err) {
      setInternships([]);
      window.alert(getApiErrorMessage(err, "Error fetching internships"));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAchievements = async () => {
    try {
      setLoading(true);
      const mappedStudents = students.length > 0 ? students : await fetchMyStudents();
      const allAchievements = [];

      for (const student of mappedStudents) {
        try {
          const res = await API.get(`/teacher/student/${student._id}/achievements`);
          if (res.data?.length > 0) {
            allAchievements.push(...res.data.map((achievement) => ({
              ...achievement,
              studentName: student.name,
              studentUsername: student.username
            })));
          }
        } catch (err) {}
      }

      setStudentAchievements(allAchievements);
    } catch (err) {
      setStudentAchievements([]);
      window.alert(getApiErrorMessage(err, "Error fetching student achievements"));
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetStats = async () => {
    try {
      setLoading(true);
      const res = await API.get("/teacher/targets", { params: teacherFilterParams });
      setTeacherTargets(res.data || []);
      return res.data || [];
    } catch (err) {
      setTeacherTargets([]);
      window.alert(getApiErrorMessage(err, "Error fetching target progress"));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handlePostInternship = async (event) => {
    event.preventDefault();
    if (!teacherFilter.department || !teacherFilter.year) {
      window.alert("Select department and year first");
      return;
    }
    if (!formData.title || !formData.url || !formData.internshipDeadline) {
      window.alert("Fill all internship fields");
      return;
    }

    try {
      await API.post("/teacher/internship", {
        title: formData.title,
        url: formData.url,
        deadline: formData.internshipDeadline,
        department: teacherFilter.department,
        year: teacherFilter.year
      });
      window.alert("Internship posted!");
      setFormData((current) => ({ ...current, title: "", url: "", internshipDeadline: "" }));
      fetchInternships();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error posting internship"));
    }
  };

  const handlePostTarget = async (event) => {
    event.preventDefault();
    if (!teacherFilter.department || !teacherFilter.year) {
      window.alert("Select department and year first");
      return;
    }
    if (!formData.targetText) {
      window.alert("Fill target");
      return;
    }

    try {
      await API.post("/teacher/target", {
        target: formData.targetText,
        department: teacherFilter.department,
        year: teacherFilter.year
      });
      window.alert("Target posted to mapped students!");
      setFormData((current) => ({ ...current, targetText: "" }));
      fetchTargetStats();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error posting target"));
    }
  };

  const handleStartAttendanceSession = async (event) => {
    event.preventDefault();
    if (!formData.attendanceDepartment || !formData.attendanceYear) {
      window.alert("Select department and year");
      return;
    }

    try {
      await API.post("/teacher/attendance/session/start", {
        department: formData.attendanceDepartment,
        year: formData.attendanceYear
      });
      window.alert("Attendance session started.");
      fetchAttendanceSessions();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error starting attendance session"));
    }
  };

  const handleEndAttendanceSession = async (sessionId) => {
    try {
      await API.patch(`/teacher/attendance/session/${sessionId}/end`);
      window.alert("Attendance session ended.");
      fetchAttendanceSessions();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error ending attendance session"));
    }
  };

  const handleGetStats = async (internshipId) => {
    if (selectedInternship === internshipId) {
      setSelectedInternship(null);
      return;
    }

    if (internshipStatsById[internshipId]) {
      setSelectedInternship(internshipId);
      return;
    }

    try {
      const res = await API.get(`/teacher/internship/${internshipId}/stats`, { params: teacherFilterParams });
      setInternshipStatsById((current) => ({
        ...current,
        [internshipId]: res.data
      }));
      setSelectedInternship(internshipId);
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error fetching stats"));
    }
  };

  const handleAddAchievement = async (event) => {
    event.preventDefault();
    if (!formData.selectedStudent || !formData.achievement) {
      window.alert("Fill all");
      return;
    }

    try {
      await API.post("/teacher/achievement", {
        studentId: formData.selectedStudent,
        title: formData.achievement,
        description: formData.achievementDesc
      });
      window.alert("Achievement added!");
      setFormData((current) => ({
        ...current,
        achievement: "",
        achievementDesc: "",
        selectedStudent: ""
      }));
      fetchStudentAchievements();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error adding achievement"));
    }
  };

  const handleSendReport = async (event) => {
    event.preventDefault();
    if (selectedInternships.length === 0) {
      window.alert("Please select at least one internship");
      return;
    }

    try {
      await API.post("/teacher/report", {
        internshipIds: selectedInternships,
        department: teacherFilter.department,
        year: teacherFilter.year
      });
      window.alert("Report generated and sent to admin!");
      setSelectedInternships([]);
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error sending report"));
    }
  };

  const displayName = authStorage.get("displayName") || authStorage.get("username") || "Teacher";
  const pendingPermissions = permissions.filter((permission) => permission.status === "pending").length;
  const isTeacherFilterComplete = Boolean(teacherFilter.department && teacherFilter.year);
  const needsTeacherFilter = activeTab !== "dashboard";
  const TeacherGroupFilter = () => (
    <SectionCard title="Class Filter" subtitle="Choose the department and year for this teacher tab.">
      <div className="portal-button-row">
        <select
          className="portal-select"
          value={teacherFilter.department}
          onChange={(event) => setTeacherFilter({ department: event.target.value, year: "" })}
        >
          <option value="">Select Department</option>
          {attendanceDepartments.map((department) => (
            <option key={department} value={department}>{department}</option>
          ))}
        </select>

        <select
          className="portal-select"
          value={teacherFilter.year}
          onChange={(event) => setTeacherFilter((current) => ({ ...current, year: event.target.value }))}
          disabled={!teacherFilter.department}
        >
          <option value="">Select Year</option>
          {teacherFilterYears.map((year) => (
            <option key={year} value={year}>Year {year}</option>
          ))}
        </select>
      </div>
      {!isTeacherFilterComplete ? (
        <p className="portal-panel-note">Select both department and year to work with the correct students.</p>
      ) : null}
    </SectionCard>
  );

  return (
    <PortalLayout
      portalTitle="Teacher Portal"
      portalSubtitle={displayName}
      headerTitle={activeTab === "dashboard" ? `Welcome, ${displayName}` : navItems.find((item) => item.key === activeTab)?.label || "Teacher Portal"}
      navItems={navItems}
      activeKey={activeTab}
      onSelect={setActiveTab}
      onLogout={() => {
        authStorage.clearSession();
        window.location.href = "/";
      }}
    >
      {activeTab !== "dashboard" ? <TeacherGroupFilter /> : null}

      {needsTeacherFilter && !isTeacherFilterComplete ? (
        <SectionCard title="Select Class">
          <EmptyState text="Choose both department and year to continue." />
        </SectionCard>
      ) : null}

      {activeTab === "dashboard" ? (
        <>
          <div className="portal-card-grid">
            <StatCard label="My Students" value={students.length} />
            <StatCard label="Internships Posted" value={internships.length} />
            <StatCard label="Pending Permissions" value={pendingPermissions} />
          </div>

          <SectionCard title="Admin Week Targets">
            <p className="portal-panel-note">No targets from admin yet.</p>
          </SectionCard>
        </>
      ) : null}

      {activeTab === "attendance" && isTeacherFilterComplete ? (
        <div className="portal-split">
          <SectionCard title="Attendance Session Control">
            <form className="portal-form-grid" onSubmit={handleStartAttendanceSession}>
              <select
                className="portal-select"
                value={formData.attendanceDepartment}
                disabled
              >
                <option value="">Select Department</option>
                {attendanceDepartments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>

              <select
                className="portal-select"
                value={formData.attendanceYear}
                disabled
              >
                <option value="">Select Year</option>
                {attendanceYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <div className="portal-button-row">
                <button type="submit" className="portal-button">Start Attendance</button>
              </div>
            </form>

            <div className="portal-detail-list">
              {attendanceSessions.length === 0 ? (
                <EmptyState text="No attendance sessions created yet." />
              ) : (
                attendanceSessions.map((session) => (
                  <div key={session._id} className="portal-session-row">
                    <div>
                      <h4>{session.department} Year {session.year}</h4>
                      <p>Date: {session.date}</p>
                    </div>
                    <div className="portal-button-row">
                      <StatusBadge tone={session.status === "active" ? "success" : "neutral"}>
                        {session.status}
                      </StatusBadge>
                      {session.status === "active" ? (
                        <button
                          type="button"
                          className="portal-button-danger"
                          onClick={() => handleEndAttendanceSession(session._id)}
                        >
                          End
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Student Absentees" subtitle="Lists students mapped to you who are absent.">
            {loading ? (
              <EmptyState text="Loading..." />
            ) : attendance.length === 0 ? (
              <EmptyState text="No absentee records found." />
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Teacher Permission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record._id}>
                        <td>{record.student?.name || "Unknown"}</td>
                        <td>{record.date}</td>
                        <td>{record.status} ({record.purpose})</td>
                        <td>{record.permissionStatus || "none"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "attendance-statistics" && isTeacherFilterComplete ? (
        <SectionCard title="Student Attendance Statistics">
          {loading ? (
            <EmptyState text="Loading..." />
          ) : attendanceStats.length === 0 ? (
            <EmptyState text="No attendance statistics available yet." />
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Total</th>
                    <th>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceStats.map((student) => (
                    <tr key={student._id}>
                      <td>{student.username}</td>
                      <td>{student.name}</td>
                      <td>{student.department || "-"}</td>
                      <td>{student.year || "-"}</td>
                      <td>{student.present}</td>
                      <td>{student.absent}</td>
                      <td>{student.total}</td>
                      <td>
                        <StatusBadge tone={student.percentage >= 85 ? "success" : student.percentage >= 75 ? "warning" : "neutral"}>
                          {student.percentage}%
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "permissions" && isTeacherFilterComplete ? (
        <SectionCard title="Student Leave Permissions">
          {loading ? (
            <EmptyState text="Loading..." />
          ) : permissions.length === 0 ? (
            <EmptyState text="No permission requests found." />
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Date</th>
                    <th>Reason</th>
                    <th>Proof</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission) => (
                    <tr key={permission._id}>
                      <td>{permission.student?.name}</td>
                      <td>{permission.date}</td>
                      <td>{permission.reason}</td>
                      <td>
                        {permission.imageProof ? (
                          <a className="portal-link-button" href={buildBackendUrl(permission.imageProof)} target="_blank" rel="noreferrer">
                            View Proof
                          </a>
                        ) : "No file"}
                      </td>
                      <td>{permission.status}</td>
                      <td>
                        {permission.status === "pending" ? (
                          <div className="portal-button-row">
                            <button type="button" className="portal-button" onClick={() => grantPermission(permission._id, "granted")}>
                              Grant
                            </button>
                            <button type="button" className="portal-button-danger" onClick={() => grantPermission(permission._id, "denied")}>
                              Deny
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "internships" && isTeacherFilterComplete ? (
        <div className="teacher-internships-layout">
          <SectionCard
            title="Post New Internship"
            subtitle="Share a fresh opportunity with your mapped students."
            className="teacher-internship-create"
          >
            <form className="portal-form-grid" onSubmit={handlePostInternship}>
              <div className="portal-field">
                <label htmlFor="internship-title">Name</label>
                <input
                  id="internship-title"
                  className="portal-input"
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                />
              </div>

              <div className="portal-field">
                <label htmlFor="internship-url">URL</label>
                <input
                  id="internship-url"
                  className="portal-input"
                  type="url"
                  value={formData.url}
                  onChange={(event) => setFormData((current) => ({ ...current, url: event.target.value }))}
                />
              </div>

              <div className="portal-field">
                <label htmlFor="internship-deadline">Deadline</label>
                <input
                  id="internship-deadline"
                  className="portal-input"
                  type="date"
                  value={formData.internshipDeadline}
                  onChange={(event) => setFormData((current) => ({ ...current, internshipDeadline: event.target.value }))}
                />
              </div>

              <div className="portal-button-row teacher-internship-submit-row">
                <button type="submit" className="portal-button">Post Internship</button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Posted Internships"
            subtitle="Review live internship links and check who has applied."
            className="teacher-internship-list-section"
          >
            {loading ? (
              <EmptyState text="Loading..." />
            ) : internships.length === 0 ? (
              <EmptyState text="No internships posted yet." />
            ) : (
              <div className="portal-simple-list">
                {internships.map((internship) => {
                  const internshipStats = internshipStatsById[internship._id];
                  const isExpanded = selectedInternship === internship._id;

                  return (
                  <div key={internship._id} className="portal-link-card teacher-internship-card">
                    <div className="teacher-internship-card-head">
                      <div>
                        <h4>{internship.title}</h4>
                        <p>{internship.url}</p>
                        <p>
                          {internship.department || "-"} Year {internship.year || "-"}
                          {internship.deadline ? ` - Deadline: ${formatDateForInput(internship.deadline)}` : ""}
                        </p>
                      </div>
                      <StatusBadge tone="success">Live</StatusBadge>
                    </div>

                    <div className="portal-button-row teacher-internship-action-row">
                      <a className="portal-link-button" href={internship.url} target="_blank" rel="noreferrer">
                        Open Link
                      </a>
                      <button type="button" className="portal-button" onClick={() => handleGetStats(internship._id)}>
                        {isExpanded ? "Hide Applications" : "View Applications"}
                      </button>
                    </div>

                    {isExpanded && internshipStats ? (
                      <div className="portal-table-wrap teacher-internship-stats">
                        <table className="portal-table">
                          <thead>
                            <tr>
                              <th>Roll Number</th>
                              <th>Name</th>
                              <th>Status</th>
                              <th>Proof</th>
                              <th>Verification</th>
                            </tr>
                          </thead>
                          <tbody>
                            {internshipStats.applied.map((student) => (
                              <tr key={`applied-${student._id}`}>
                                <td>{student.student?.username}</td>
                                <td>{student.student?.name}</td>
                                <td><StatusBadge tone="success">Applied</StatusBadge></td>
                                <td>
                                  {student.applicationProof ? (
                                    <a className="portal-link-button" href={buildBackendUrl(student.applicationProof)} target="_blank" rel="noreferrer">
                                      View Proof
                                    </a>
                                  ) : "No proof"}
                                </td>
                                <td>{student.proofVerificationStatus || "not_checked"}</td>
                              </tr>
                            ))}
                            {internshipStats.notApplied.map((student) => (
                              <tr key={`not-applied-${student._id}`}>
                                <td>{student.student?.username}</td>
                                <td>{student.student?.name}</td>
                                <td><StatusBadge tone="warning">Not Applied</StatusBadge></td>
                                <td>
                                  {student.applicationProof ? (
                                    <a className="portal-link-button" href={buildBackendUrl(student.applicationProof)} target="_blank" rel="noreferrer">
                                      View Proof
                                    </a>
                                  ) : "No proof"}
                                </td>
                                <td>{student.proofVerificationStatus || "not_checked"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                )})}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "targets" && isTeacherFilterComplete ? (
        <div className="teacher-targets-layout">
          <SectionCard
            title="Post Targets to Students"
            subtitle="Enter one task per line. Each line becomes a bullet-point target for every mapped student."
            className="teacher-target-compose"
          >
            <form className="portal-form-grid" onSubmit={handlePostTarget}>
              <textarea
                className="portal-textarea"
                rows="6"
                placeholder={"Finish contest\nSubmit resume\nPractice aptitude"}
                value={formData.targetText}
                onChange={(event) => setFormData((current) => ({ ...current, targetText: event.target.value }))}
              />
              <div className="portal-button-row">
                <button type="submit" className="portal-button">Post Targets</button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Target Progress"
            subtitle="Track completion percentages for each task across your mapped students."
            className="teacher-target-progress-section"
          >
            {loading ? (
              <EmptyState text="Loading target progress..." />
            ) : teacherTargets.length === 0 ? (
              <EmptyState text="No targets posted yet." />
            ) : (
              <div className="portal-simple-list">
                {teacherTargets.map((target) => {
                  const studentsForTarget = Array.isArray(target.students) ? target.students : [];
                  const completedPercentage = Number.isFinite(target.completedPercentage) ? target.completedPercentage : 0;
                  const ongoingPercentage = Number.isFinite(target.ongoingPercentage) ? target.ongoingPercentage : 0;
                  const notStartedPercentage = Number.isFinite(target.notStartedPercentage) ? target.notStartedPercentage : 0;
                  const isExpanded = expandedTargetId === target._id;

                  return (
                  <div key={target._id} className="teacher-target-card">
                    <div className="teacher-target-card-head">
                      <div>
                        <h4>{target.title}</h4>
                        <p>{completedPercentage}% completed</p>
                      </div>
                      <StatusBadge tone={completedPercentage === 100 ? "success" : "warning"}>
                        {target.completedCount}/{target.totalStudents} done
                      </StatusBadge>
                    </div>

                    <div className="teacher-target-progress-bar" aria-label={`${target.title} progress`}>
                      <span
                        className="segment completed"
                        style={{ width: `${completedPercentage}%` }}
                      />
                      <span
                        className="segment ongoing"
                        style={{ width: `${ongoingPercentage}%` }}
                      />
                      <span
                        className="segment not-started"
                        style={{ width: `${notStartedPercentage}%` }}
                      />
                    </div>

                    <div className="teacher-target-legend">
                      <span><i className="dot completed" />Completed {completedPercentage}%</span>
                      <span><i className="dot ongoing" />Ongoing {ongoingPercentage}%</span>
                      <span><i className="dot not-started" />Not Started {notStartedPercentage}%</span>
                    </div>

                    <div className="portal-button-row teacher-target-actions">
                      <button
                        type="button"
                        className="portal-button-secondary"
                        onClick={() => setExpandedTargetId((current) => current === target._id ? null : target._id)}
                      >
                        {isExpanded ? "Hide Student Details" : "View Student Details"}
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="portal-table-wrap teacher-target-student-table">
                        <table className="portal-table">
                          <thead>
                            <tr>
                              <th>Roll Number</th>
                              <th>Name</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentsForTarget.map((entry) => (
                              <tr key={entry._id}>
                                <td>{entry.student?.username}</td>
                                <td>{entry.student?.name}</td>
                                <td>
                                  <StatusBadge
                                    tone={
                                      entry.status === "completed"
                                        ? "success"
                                        : entry.status === "ongoing"
                                          ? "warning"
                                          : "danger"
                                    }
                                  >
                                    {formatTargetStatusLabel(entry.status)}
                                  </StatusBadge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                )})}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "student-achievements" && isTeacherFilterComplete ? (
        <div className="portal-split">
          <SectionCard title="Add Student Achievement">
            <form className="portal-form-grid" onSubmit={handleAddAchievement}>
              <select
                className="portal-select"
                value={formData.selectedStudent}
                onChange={(event) => setFormData((current) => ({ ...current, selectedStudent: event.target.value }))}
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.username} - {student.name}
                  </option>
                ))}
              </select>

              <input
                className="portal-input"
                type="text"
                placeholder="Achievement Title"
                value={formData.achievement}
                onChange={(event) => setFormData((current) => ({ ...current, achievement: event.target.value }))}
              />

              <textarea
                className="portal-textarea"
                rows="4"
                placeholder="Achievement Description"
                value={formData.achievementDesc}
                onChange={(event) => setFormData((current) => ({ ...current, achievementDesc: event.target.value }))}
              />

              <div className="portal-button-row">
                <button type="submit" className="portal-button">Add Achievement</button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Student Shared Achievements">
            {loading ? (
              <EmptyState text="Loading..." />
            ) : studentAchievements.length === 0 ? (
              <EmptyState text="No achievements shared yet." />
            ) : (
              <div className="portal-simple-list">
                {studentAchievements.map((achievement) => (
                  <div key={achievement._id} className="portal-simple-list-item">
                    <h4>{achievement.title}</h4>
                    <p>{achievement.description || "No description added."}</p>
                    <p>Student: {achievement.studentUsername} - {achievement.studentName}</p>
                    {achievement.shared ? <StatusBadge tone="success">Shared with you</StatusBadge> : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "report" && isTeacherFilterComplete ? (
        <SectionCard title="Send Internship Report to Admin" subtitle="Select internships to include as columns in the Excel report.">
          <form className="portal-form-grid" onSubmit={handleSendReport}>
            <div className="portal-simple-list">
              {internships.map((internship) => (
                <label key={internship._id} className="portal-checkbox-row">
                  <input
                    type="checkbox"
                    value={internship._id}
                    checked={selectedInternships.includes(internship._id)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedInternships((current) => [...current, internship._id]);
                      } else {
                        setSelectedInternships((current) => current.filter((id) => id !== internship._id));
                      }
                    }}
                  />
                  <span>{internship.title}</span>
                </label>
              ))}
            </div>

            <div className="portal-button-row">
              <button type="submit" className="portal-button">Generate Excel and Send</button>
            </div>
          </form>
        </SectionCard>
      ) : null}
    </PortalLayout>
  );
}

export default TeacherDashboard;
