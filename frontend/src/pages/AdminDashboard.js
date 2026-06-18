import React, { useEffect, useMemo, useState } from "react";
import API, { buildBackendUrl, getApiErrorMessage } from "../api";
import authStorage from "../authStorage";
import PortalLayout, { EmptyState, SectionCard, StatCard, StatusBadge } from "../components/PortalLayout";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    teacherDepartments: [],
    studentDepartments: [],
    years: [],
    teachers: []
  });
  const [uploading, setUploading] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [file, setFile] = useState(null);
  const [teacherDepartmentFilter, setTeacherDepartmentFilter] = useState("");
  const [studentDepartmentFilter, setStudentDepartmentFilter] = useState("");
  const [studentYearFilter, setStudentYearFilter] = useState("");
  const [studentTeacherFilter, setStudentTeacherFilter] = useState("");

  useEffect(() => {
    fetchFilters();
    fetchReports();
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [teacherDepartmentFilter]);

  useEffect(() => {
    fetchStudents();
  }, [studentDepartmentFilter, studentYearFilter, studentTeacherFilter]);

  const filteredTeacherOptions = useMemo(() => {
    if (!studentDepartmentFilter) return filters.teachers;
    return filters.teachers.filter((teacher) => teacher.department === studentDepartmentFilter);
  }, [filters.teachers, studentDepartmentFilter]);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "teachers", label: "Teachers", icon: "users" },
    { key: "students", label: "Students", icon: "graduation" },
    { key: "upload", label: "Upload Excel", icon: "upload" },
    { key: "reports", label: "Teacher Reports", icon: "file" }
  ];

  const fetchFilters = async () => {
    try {
      setLoadingFilters(true);
      const res = await API.get("/admin/meta/filters");
      setFilters({
        teacherDepartments: res.data.teacherDepartments || [],
        studentDepartments: res.data.studentDepartments || [],
        years: res.data.years || [],
        teachers: res.data.teachers || []
      });
    } catch (err) {
      setFilters({ teacherDepartments: [], studentDepartments: [], years: [], teachers: [] });
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const params = teacherDepartmentFilter ? { params: { department: teacherDepartmentFilter } } : undefined;
      const res = await API.get("/admin/users/teacher", params);
      setTeachers(res.data || []);
    } catch (err) {
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const res = await API.get("/admin/users/student", {
        params: {
          ...(studentDepartmentFilter ? { department: studentDepartmentFilter } : {}),
          ...(studentYearFilter ? { year: studentYearFilter } : {}),
          ...(studentTeacherFilter ? { teacherId: studentTeacherFilter } : {})
        }
      });
      setStudents(res.data || []);
    } catch (err) {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const res = await API.get("/admin/reports");
      setReports(res.data || []);
    } catch (err) {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      window.alert("Please select a file");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await API.post("/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      window.alert(
        `${res.data.message}\n\n` +
        `New teachers: ${res.data.teachersCreated || 0}\n` +
        `New students: ${res.data.studentsCreated || 0}\n` +
        `Teacher emails sent: ${res.data.teacherEmailsSent || 0}\n` +
        `Student emails sent: ${res.data.studentEmailsSent || 0}\n` +
        `Teacher emails skipped: ${res.data.teacherEmailsSkipped || 0}\n` +
        `Student emails skipped: ${res.data.studentEmailsSkipped || 0}\n` +
        `Teacher email failures: ${res.data.teacherEmailsFailed || 0}\n` +
        `Student email failures: ${res.data.studentEmailsFailed || 0}`
      );

      setFile(null);
      const fileInput = document.getElementById("fileInput");
      if (fileInput) fileInput.value = "";
      await Promise.all([fetchFilters(), fetchTeachers(), fetchStudents()]);
      setActiveTab("dashboard");
    } catch (err) {
      window.alert(`Upload failed: ${getApiErrorMessage(err, "Unable to upload file")}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await API.delete(`/admin/users/${userId}`);
      window.alert("User deleted");
      await Promise.all([fetchFilters(), fetchTeachers(), fetchStudents()]);
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error deleting user"));
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await API.delete(`/admin/reports/${reportId}`);
      window.alert("Report deleted");
      await fetchReports();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Error deleting report"));
    }
  };

  const teacherPreview = teachers.slice(0, 6);
  const displayName = authStorage.get("displayName") || "Administrator";

  return (
    <PortalLayout
      portalTitle="Admin Portal"
      portalSubtitle={displayName}
      headerTitle={activeTab === "dashboard" ? "Dashboard" : navItems.find((item) => item.key === activeTab)?.label || "Dashboard"}
      navItems={navItems}
      activeKey={activeTab}
      onSelect={setActiveTab}
      onLogout={() => {
        authStorage.clearSession();
        window.location.href = "/";
      }}
    >
      {activeTab === "dashboard" ? (
        <>
          <div className="portal-card-grid">
            <StatCard label="Total Teachers" value={teachers.length} />
            <StatCard label="Total Students" value={students.length} />
            <StatCard label="Reports Submitted" value={reports.length} />
          </div>

          <SectionCard title="Teacher Activity">
            {loadingTeachers ? (
              <EmptyState text="Loading teachers..." />
            ) : teacherPreview.length === 0 ? (
              <EmptyState text="No teachers found." />
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Students</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherPreview.map((teacher) => {
                      const assignedStudents = students.filter((student) => (
                        student.assignedTeacher?._id === teacher._id || student.teacherName === teacher.name
                      )).length;

                      return (
                        <tr key={teacher._id}>
                          <td>{teacher.name}</td>
                          <td>{teacher.username}</td>
                          <td>{teacher.email || "Not provided"}</td>
                          <td>{assignedStudents}</td>
                          <td>
                            <StatusBadge tone={teacher.loginCount === 0 ? "warning" : "neutral"}>
                              {teacher.loginCount === 0 ? "Pending" : "Active"}
                            </StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      ) : null}

      {activeTab === "upload" ? (
        <SectionCard
          title="Upload Teacher and Student Excel Sheet"
          subtitle="Recommended columns: teacher_name, teacher_username, teacher_password, teacher_email, teacher_department, student_name, student_rollno, student_email, student_department, student_year, assigned_teacher_username."
        >
          <form className="portal-form-grid" onSubmit={handleUpload}>
            <input
              id="fileInput"
              className="portal-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setFile(event.target.files[0] || null)}
            />
            <div className="portal-button-row">
              <button type="submit" disabled={uploading} className="portal-button">
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      {activeTab === "teachers" ? (
        <SectionCard title={`Teachers (${teachers.length})`}>
          <div className="portal-form-grid">
            <select
              className="portal-select"
              value={teacherDepartmentFilter}
              onChange={(event) => setTeacherDepartmentFilter(event.target.value)}
            >
              <option value="">All Departments</option>
              {filters.teacherDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>

          {loadingFilters ? <p className="portal-panel-note">Loading filter options...</p> : null}

          {loadingTeachers ? (
            <EmptyState text="Loading teachers..." />
          ) : teachers.length === 0 ? (
            <EmptyState text="No teachers found." />
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher._id}>
                      <td>{teacher.name}</td>
                      <td>{teacher.username}</td>
                      <td>{teacher.email || "Not set"}</td>
                      <td>{teacher.department || "Not set"}</td>
                      <td>
                        <StatusBadge tone={teacher.loginCount === 0 ? "warning" : "success"}>
                          {teacher.loginCount === 0 ? "Pending Face Registration" : "Active"}
                        </StatusBadge>
                      </td>
                      <td>
                        <button type="button" className="portal-button-danger" onClick={() => handleDeleteUser(teacher._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "students" ? (
        <SectionCard title={`Students (${students.length})`}>
          <div className="portal-form-grid">
            <select
              className="portal-select"
              value={studentDepartmentFilter}
              onChange={(event) => {
                const nextDepartment = event.target.value;
                setStudentDepartmentFilter(nextDepartment);
                setStudentTeacherFilter("");
              }}
            >
              <option value="">All Departments</option>
              {filters.studentDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>

            <select
              className="portal-select"
              value={studentYearFilter}
              onChange={(event) => setStudentYearFilter(event.target.value)}
            >
              <option value="">All Years</option>
              {filters.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              className="portal-select"
              value={studentTeacherFilter}
              onChange={(event) => setStudentTeacherFilter(event.target.value)}
            >
              <option value="">All Teachers</option>
              {filteredTeacherOptions.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.username})
                </option>
              ))}
            </select>
          </div>

          {loadingStudents ? (
            <EmptyState text="Loading students..." />
          ) : students.length === 0 ? (
            <EmptyState text="No students found." />
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Assigned Teacher</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td>{student.username}</td>
                      <td>{student.name}</td>
                      <td>{student.department || "Not set"}</td>
                      <td>{student.year || "Not set"}</td>
                      <td>{student.assignedTeacher?.name || student.teacherName || "Unassigned"}</td>
                      <td>
                        <StatusBadge tone={student.loginCount === 0 ? "warning" : "success"}>
                          {student.loginCount === 0 ? "Pending Face Registration" : "Active"}
                        </StatusBadge>
                      </td>
                      <td>
                        <button type="button" className="portal-button-danger" onClick={() => handleDeleteUser(student._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "reports" ? (
        <SectionCard title="Submitted Internship Reports">
          {loadingReports ? (
            <EmptyState text="Loading reports..." />
          ) : reports.length === 0 ? (
            <EmptyState text="No reports submitted yet." />
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Submission Date</th>
                    <th>Report File</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report._id}>
                      <td>{report.teacher?.name || "Unknown"}</td>
                      <td>{new Date(report.submittedAt || report.createdAt).toLocaleDateString()}</td>
                      <td>
                        <a
                          className="portal-link-button"
                          href={buildBackendUrl((report.content || "").replace(/\\/g, "/"))}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download Excel
                        </a>
                      </td>
                      <td>
                        <button type="button" className="portal-button-danger" onClick={() => handleDeleteReport(report._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}
    </PortalLayout>
  );
}

export default AdminDashboard;
