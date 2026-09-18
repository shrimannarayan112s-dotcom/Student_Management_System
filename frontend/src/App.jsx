import { useState } from "react";
import "./App.css";
import adminImage from "./assets/admin-dashboard.svg";
import facultyImage from "./assets/faculty-portal.svg";
import studentImage from "./assets/student-portal.svg";

const API_URL = import.meta.env.VITE_API_URL || "${API_URL}";

function BulkPastePanel({ title, endpoint, username, columns, onComplete }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const rows = value.trim().split(/\r?\n/).filter(Boolean).map((line) => line.split("\t"));
    if (!rows.length || rows.some((row) => row.length !== columns.length || row.some((cell) => !cell.trim()))) {
      setMessage(`Paste one tab-separated value for each column in every row.`);
      return;
    }

    try {
      setLoading(true);
      const results = [];
      for (const row of rows) {
        const payload = Object.fromEntries(columns.map((column, index) => [column.key, column.numeric ? Number(row[index]) : row[index].trim()]));
        const response = await fetch(`${endpoint}?username=${encodeURIComponent(username)}`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        results.push(await response.json());
      }
      const created = results.filter((result) => result.status === "success").length;
      setMessage(`${created} of ${rows.length} records added.`);
      if (created === rows.length) setValue("");
      await onComplete();
    } catch (error) {
      console.error(`Bulk ${title} Error:`, error);
      setMessage("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="bulk-paste-panel" onSubmit={handleSubmit}>
      <div className="bulk-panel-heading"><strong>⚡ Add multiple {title.toLowerCase()}</strong><span>Paste rows copied from Excel</span></div>
      <p className="bulk-hint">Column order: {columns.map((column) => column.label).join(" | ")}</p>
      <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Paste tab-separated rows here" rows="4" />
      {message && <p className="message">{message}</p>}
      <button type="submit" className="secondary-button" disabled={loading}>{loading ? "Saving..." : `Save ${title.toLowerCase()}`}</button>
    </form>
  );
}

function SpreadsheetGrid({ rows, setRows, columns, onSubmit, loading, buttonLabel }) {
  const createRow = () => Object.fromEntries(columns.map((column) => [column.key, column.initialValue || ""]));

  const updateRow = (rowIndex, field, value) => {
    setRows((currentRows) => currentRows.map((row, index) => index === rowIndex ? { ...row, [field]: value } : row));
  };

  const handleKeyDown = (event, rowIndex, field) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const fieldIndex = columns.findIndex((column) => column.key === field);
    const isLastField = fieldIndex === columns.length - 1;
    const nextRow = isLastField ? rowIndex + 1 : rowIndex;
    const nextField = isLastField ? columns[0].key : columns[fieldIndex + 1].key;

    if (isLastField && nextRow >= rows.length) setRows((currentRows) => [...currentRows, createRow()]);
    window.setTimeout(() => document.querySelector(`[data-sheet-row="${nextRow}"][data-sheet-field="${nextField}"]`)?.focus(), 0);
  };

  return (
    <form className="bulk-form" onSubmit={onSubmit}>
      <div className="bulk-table-container">
        <table className="bulk-table">
          <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th></th></tr></thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.options ? (
                      <select data-sheet-row={rowIndex} data-sheet-field={column.key} onKeyDown={(event) => handleKeyDown(event, rowIndex, column.key)} value={row[column.key]} onChange={(event) => updateRow(rowIndex, column.key, event.target.value)}>
                        {column.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : (
                      <input data-sheet-row={rowIndex} data-sheet-field={column.key} onKeyDown={(event) => handleKeyDown(event, rowIndex, column.key)} type={column.type || "text"} value={row[column.key]} onChange={(event) => updateRow(rowIndex, column.key, event.target.value)} placeholder={column.label} />
                    )}
                  </td>
                ))}
                <td><button type="button" className="icon-button" aria-label="Remove row" onClick={() => setRows((currentRows) => currentRows.filter((_, index) => index !== rowIndex))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bulk-actions">
        <button type="button" className="secondary-button" onClick={() => setRows((currentRows) => [...currentRows, createRow()])}>＋ Add row</button>
        <button type="submit" className="login-button" disabled={loading}>{loading ? "Saving..." : buttonLabel}</button>
      </div>
    </form>
  );
}

function ResultTable({ title, rows, columns }) {
  return (
    <div className="saved-record">
      <h3>{title}</h3>
      <div className="bulk-table-container">
        <table className="bulk-table">
          <thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.id || row.student_id || index}>{columns.map((column) => <td key={column}>{row[column] ?? ""}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [adminId, setAdminId] = useState(null);
  const [adminRole, setAdminRole] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("admin");
  const [facultyLoggedIn, setFacultyLoggedIn] = useState(false);
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [facultyStudents, setFacultyStudents] = useState([]);
  const [facultyStudentsLoading, setFacultyStudentsLoading] = useState(false);
  const [facultyStudentsMessage, setFacultyStudentsMessage] = useState("");
  const [facultyAttendanceStudents, setFacultyAttendanceStudents] = useState([]);
  const [facultyAttendanceSubjects, setFacultyAttendanceSubjects] = useState([]);
  const [facultyAttendanceStudentId, setFacultyAttendanceStudentId] = useState("");
  const [facultyAttendanceSubjectId, setFacultyAttendanceSubjectId] = useState("");
  const [facultyAttendanceDate, setFacultyAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [facultyAttendanceStatus, setFacultyAttendanceStatus] = useState("Present");
  const [facultyAttendanceMessage, setFacultyAttendanceMessage] = useState("");
  const [facultyAttendanceLoading, setFacultyAttendanceLoading] = useState(false);
  const [facultyMarksStudentId, setFacultyMarksStudentId] = useState("");
  const [facultyMarksSubjectId, setFacultyMarksSubjectId] = useState("");
  const [facultyInternalMarks, setFacultyInternalMarks] = useState("");
  const [facultyExternalMarks, setFacultyExternalMarks] = useState("");
  const [facultyMarksMessage, setFacultyMarksMessage] = useState("");
  const [facultyMarksLoading, setFacultyMarksLoading] = useState(false);
  const [facultyTimetable, setFacultyTimetable] = useState([]);
  const [facultyNotices, setFacultyNotices] = useState([]);
  const [facultyPortalMessage, setFacultyPortalMessage] = useState("");
  const [studentLoggedIn, setStudentLoggedIn] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentMarks, setStudentMarks] = useState([]);
  const [studentResult, setStudentResult] = useState(null);
  const [studentTimetable, setStudentTimetable] = useState([]);
  const [studentNotices, setStudentNotices] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [students, setStudents] = useState([]);

  const [showStudents, setShowStudents] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showSearchStudent, setShowSearchStudent] = useState(false);
  const [showUpdateStudent, setShowUpdateStudent] = useState(false);
  const [showDeleteStudent, setShowDeleteStudent] = useState(false);
  const [showBulkStudentEntry, setShowBulkStudentEntry] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkStudentRows, setBulkStudentRows] = useState([
    { name: "", email: "", gender: "", dob: "", department_id: "" },
  ]);
  const [bulkStudentMessage, setBulkStudentMessage] = useState("");
  const [bulkStudentLoading, setBulkStudentLoading] = useState(false);
  const [bulkAddedStudents, setBulkAddedStudents] = useState([]);

  const [showDashboardStats, setShowDashboardStats] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsMessage, setStatsMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // =========================
  // CHANGE PASSWORD STATES
  // =========================

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [changePasswordMessage, setChangePasswordMessage] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // =========================
  // ADMIN PROFILE
  // =========================

  const [showAdminProfile, setShowAdminProfile] = useState(false);

  // =========================
  // ACTIVITY LOGS STATES
  // =========================

  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [activityLogsMessage, setActivityLogsMessage] = useState("");

  // =========================
  // ADMIN MANAGEMENT STATES
  // =========================

  const [showAdminManagement, setShowAdminManagement] = useState(false);
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [adminAccountsLoading, setAdminAccountsLoading] = useState(false);
  const [adminAccountsMessage, setAdminAccountsMessage] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminConfirmPassword, setNewAdminConfirmPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("Staff");
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [adminActionLoadingId, setAdminActionLoadingId] = useState(null);
  const [showBulkAdminEntry, setShowBulkAdminEntry] = useState(false);
  const [bulkAdminRows, setBulkAdminRows] = useState([
    { username: "", password: "", confirm_password: "", role: "Staff" },
  ]);
  const [bulkAdminLoading, setBulkAdminLoading] = useState(false);

  // =========================
  // FACULTY MANAGEMENT STATES
  // =========================

  const [showFacultyManagement, setShowFacultyManagement] = useState(false);
  const [facultyMembers, setFacultyMembers] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [facultyMessage, setFacultyMessage] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [facultyPhone, setFacultyPhone] = useState("");
  const [facultyDepartmentId, setFacultyDepartmentId] = useState("");
  const [facultyDesignation, setFacultyDesignation] = useState("");
  const [facultyUsername, setFacultyUsername] = useState("");
  const [facultyPassword, setFacultyPassword] = useState("");
  const [facultyConfirmPassword, setFacultyConfirmPassword] = useState("");
  const [createFacultyLoading, setCreateFacultyLoading] = useState(false);

  // =========================
  // COURSE MANAGEMENT STATES
  // =========================

  const [showCourseManagement, setShowCourseManagement] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseMessage, setCourseMessage] = useState("");
  const [courseDepartmentId, setCourseDepartmentId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDuration, setCourseDuration] = useState("3");
  const [createCourseLoading, setCreateCourseLoading] = useState(false);

  // =========================
  // SEMESTER MANAGEMENT STATES
  // =========================

  const [showSemesterManagement, setShowSemesterManagement] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [semesterCourses, setSemesterCourses] = useState([]);
  const [semestersLoading, setSemestersLoading] = useState(false);
  const [semesterMessage, setSemesterMessage] = useState("");
  const [semesterCourseId, setSemesterCourseId] = useState("");
  const [semesterNumber, setSemesterNumber] = useState("1");
  const [semesterName, setSemesterName] = useState("");
  const [createSemesterLoading, setCreateSemesterLoading] = useState(false);

  // =========================
  // SUBJECT MANAGEMENT STATES
  // =========================

  const [showSubjectManagement, setShowSubjectManagement] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [subjectSemesters, setSubjectSemesters] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectMessage, setSubjectMessage] = useState("");
  const [subjectSemesterId, setSubjectSemesterId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectCredits, setSubjectCredits] = useState("3");
  const [createSubjectLoading, setCreateSubjectLoading] = useState(false);

  // =========================
  // SECTION MANAGEMENT STATES
  // =========================

  const [showSectionManagement, setShowSectionManagement] = useState(false);
  const [sections, setSections] = useState([]);
  const [sectionSemesters, setSectionSemesters] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionMessage, setSectionMessage] = useState("");
  const [sectionSemesterId, setSectionSemesterId] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [sectionCapacity, setSectionCapacity] = useState("60");
  const [createSectionLoading, setCreateSectionLoading] = useState(false);

  // =========================
  // ADD STUDENT STATES
  // =========================

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [addMessage, setAddMessage] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [lastAddedStudent, setLastAddedStudent] = useState(null);

  // =========================
  // SEARCH STUDENT STATES
  // =========================

  const [searchType, setSearchType] = useState("id");
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  // =========================
  // UPDATE STUDENT STATES
  // =========================

  const [updateId, setUpdateId] = useState("");
  const [updateName, setUpdateName] = useState("");
  const [updateEmail, setUpdateEmail] = useState("");
  const [updateGender, setUpdateGender] = useState("");
  const [updateDateOfBirth, setUpdateDateOfBirth] = useState("");
  const [updateDepartmentId, setUpdateDepartmentId] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // =========================
  // DELETE STUDENT STATES
  // =========================

  const [deleteType, setDeleteType] = useState("id");
  const [deleteValue, setDeleteValue] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showBulkDeleteEntry, setShowBulkDeleteEntry] = useState(false);
  const [bulkDeleteRows, setBulkDeleteRows] = useState([{ value: "" }]);
  const [bulkDeleteResults, setBulkDeleteResults] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const [bulkAdminResults, setBulkAdminResults] = useState([]);
  const [bulkFacultyRows, setBulkFacultyRows] = useState([{ name: "", email: "", phone: "", department_id: "", designation: "", username: "", password: "", confirm_password: "" }]);
  const [bulkFacultyResults, setBulkFacultyResults] = useState([]);
  const [bulkFacultyLoading, setBulkFacultyLoading] = useState(false);

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginMessage("");

    if (!username.trim() || !password.trim()) {
      setLoginMessage("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const loginEndpoint = loginType === "faculty"
        ? `${API_URL}/faculty/login`
        : loginType === "student"
          ? `${API_URL}/student/login`
          : `${API_URL}/login`;

      const response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        if (loginType === "faculty") {
          setFacultyLoggedIn(true);
          setFacultyProfile(data);
          setFacultyStudentsLoading(true);
          try {
            const facultyStudentsResponse = await fetch(
              `${API_URL}/faculty/students?username=${encodeURIComponent(
                data.username
              )}`
            );
            const facultyStudentsData = await facultyStudentsResponse.json();
            setFacultyStudents(facultyStudentsData.students || []);
            setFacultyStudentsMessage(
              facultyStudentsData.status === "success"
                ? ""
                : facultyStudentsData.message || "Unable to load students."
            );
          } catch (facultyStudentsError) {
            console.error("Faculty Students Error:", facultyStudentsError);
            setFacultyStudents([]);
            setFacultyStudentsMessage("Unable to load students.");
          } finally {
            setFacultyStudentsLoading(false);
          }
          try {
            const attendanceOptionsResponse = await fetch(
              `${API_URL}/faculty/attendance-options?username=${encodeURIComponent(
                data.username
              )}`
            );
            const attendanceOptionsData = await attendanceOptionsResponse.json();
            setFacultyAttendanceStudents(attendanceOptionsData.students || []);
            setFacultyAttendanceSubjects(attendanceOptionsData.subjects || []);
            setFacultyAttendanceMessage(
              attendanceOptionsData.status === "success"
                ? ""
                : attendanceOptionsData.message || "Unable to load attendance options."
            );
          } catch (attendanceOptionsError) {
            console.error("Faculty Attendance Options Error:", attendanceOptionsError);
            setFacultyAttendanceStudents([]);
            setFacultyAttendanceSubjects([]);
            setFacultyAttendanceMessage("Unable to load attendance options.");
          }
          try {
            const facultyTimetableResponse = await fetch(
              `${API_URL}/faculty/timetable?username=${encodeURIComponent(
                data.username
              )}`
            );
            const facultyTimetableData = await facultyTimetableResponse.json();
            const facultyNoticesResponse = await fetch(
              `${API_URL}/faculty/notices?username=${encodeURIComponent(
                data.username
              )}`
            );
            const facultyNoticesData = await facultyNoticesResponse.json();
            setFacultyTimetable(facultyTimetableData.timetable || []);
            setFacultyNotices(facultyNoticesData.notices || []);
            setFacultyPortalMessage(
              facultyTimetableData.status === "success" && facultyNoticesData.status === "success"
                ? ""
                : "Unable to load all faculty portal information."
            );
          } catch (facultyPortalError) {
            console.error("Faculty Portal Data Error:", facultyPortalError);
            setFacultyTimetable([]);
            setFacultyNotices([]);
            setFacultyPortalMessage("Unable to load timetable and notices.");
          }
          setFacultyMarksStudentId("");
          setFacultyMarksSubjectId("");
          setFacultyInternalMarks("");
          setFacultyExternalMarks("");
          setFacultyMarksMessage("");
          setLoggedIn(false);
        } else if (loginType === "student") {
          setStudentLoggedIn(true);
          setStudentProfile(data);
          try {
            const subjectResponse = await fetch(
              `${API_URL}/student/subjects?username=${encodeURIComponent(
                data.username
              )}`
            );
            const subjectData = await subjectResponse.json();
            setStudentSubjects(subjectData.subjects || []);

            const attendanceResponse = await fetch(
              `${API_URL}/student/attendance?username=${encodeURIComponent(
                data.username
              )}`
            );
            const attendanceData = await attendanceResponse.json();
            setStudentAttendance(attendanceData.subjects || []);

            const marksResponse = await fetch(
              `${API_URL}/student/marks?username=${encodeURIComponent(
                data.username
              )}`
            );
            const marksData = await marksResponse.json();
            setStudentMarks(marksData.marks || []);

            const resultResponse = await fetch(
              `${API_URL}/student/result?username=${encodeURIComponent(
                data.username
              )}`
            );
            const resultData = await resultResponse.json();
            setStudentResult(resultData);

            const timetableResponse = await fetch(
              `${API_URL}/student/timetable?username=${encodeURIComponent(
                data.username
              )}`
            );
            const timetableData = await timetableResponse.json();
            setStudentTimetable(timetableData.timetable || []);

            const noticeResponse = await fetch(
              `${API_URL}/student/notices?username=${encodeURIComponent(
                data.username
              )}`
            );
            const noticeData = await noticeResponse.json();
            setStudentNotices(noticeData.notices || []);
          } catch (subjectError) {
            console.error("Student Subjects Error:", subjectError);
            setStudentSubjects([]);
            setStudentAttendance([]);
            setStudentMarks([]);
            setStudentResult(null);
            setStudentTimetable([]);
            setStudentNotices([]);
          }
          setLoggedIn(false);
        } else {
          setLoggedIn(true);
          setUsername(data.username || username.trim());
          setAdminId(data.id ?? null);
          setAdminRole(data.role || "Administrator");
          setAdminStatus(data.account_status || "Active");
        }
        setLoginMessage("");
      } else {
        setLoginMessage(data.message || "Invalid username or password.");
      }
    } catch (error) {
      console.error("Login Error:", error);

      setLoginMessage(
        "Unable to connect to server. Please make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFacultyAttendanceSubmit = async (e) => {
    e.preventDefault();
    setFacultyAttendanceMessage("");

    if (!facultyAttendanceStudentId || !facultyAttendanceSubjectId || !facultyAttendanceDate) {
      setFacultyAttendanceMessage("Please select a student, subject, and date.");
      return;
    }

    try {
      setFacultyAttendanceLoading(true);
      const response = await fetch(
        `${API_URL}/faculty/attendance?username=${encodeURIComponent(
          facultyProfile.username
        )}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            student_id: Number(facultyAttendanceStudentId),
            subject_id: Number(facultyAttendanceSubjectId),
            attendance_date: facultyAttendanceDate,
            status: facultyAttendanceStatus
          })
        }
      );
      const data = await response.json();
      setFacultyAttendanceMessage(data.message || "Unable to record attendance.");
    } catch (error) {
      console.error("Faculty Attendance Error:", error);
      setFacultyAttendanceMessage("Unable to connect to the server.");
    } finally {
      setFacultyAttendanceLoading(false);
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {
    setLoggedIn(false);
    setFacultyLoggedIn(false);
    setFacultyProfile(null);
    setFacultyStudents([]);
    setFacultyStudentsMessage("");
    setFacultyAttendanceStudents([]);
    setFacultyAttendanceSubjects([]);
    setFacultyAttendanceStudentId("");
    setFacultyAttendanceSubjectId("");
    setFacultyAttendanceMessage("");
    setFacultyMarksStudentId("");
    setFacultyMarksSubjectId("");
    setFacultyInternalMarks("");
    setFacultyExternalMarks("");
    setFacultyMarksMessage("");
    setFacultyTimetable([]);
    setFacultyNotices([]);
    setFacultyPortalMessage("");
    setStudentLoggedIn(false);
    setStudentProfile(null);
    setStudentSubjects([]);
    setStudentAttendance([]);
    setStudentMarks([]);
    setStudentResult(null);
    setStudentTimetable([]);
    setStudentNotices([]);
    setAdminId(null);
    setAdminRole("");
    setAdminStatus("");

    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setShowAdminManagement(false);
    setShowFacultyManagement(false);
    setShowCourseManagement(false);
    setShowSemesterManagement(false);
    setShowSubjectManagement(false);
    setShowSectionManagement(false);

    setSelectedCategory("");
    setStatsMessage("");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordMessage("");
    setChangePasswordSuccess(false);

    setActivityLogs([]);
    setActivityLogsMessage("");
    setAdminAccounts([]);
    setAdminAccountsMessage("");
    setNewAdminUsername("");
    setNewAdminPassword("");
    setNewAdminConfirmPassword("");
    setNewAdminRole("Staff");
    setFacultyMembers([]);
    setFacultyMessage("");
    setFacultyName("");
    setFacultyEmail("");
    setFacultyPhone("");
    setFacultyDepartmentId("");
    setFacultyDesignation("");
    setFacultyUsername("");
    setFacultyPassword("");
    setFacultyConfirmPassword("");
    setCourses([]);
    setCourseMessage("");
    setCourseDepartmentId("");
    setCourseName("");
    setCourseCode("");
    setCourseDuration("3");
    setSemesters([]);
    setSemesterCourses([]);
    setSemesterMessage("");
    setSemesterCourseId("");
    setSemesterNumber("1");
    setSemesterName("");
    setSubjects([]);
    setSubjectSemesters([]);
    setSubjectMessage("");
    setSubjectSemesterId("");
    setSubjectName("");
    setSubjectCode("");
    setSubjectCredits("3");
    setSections([]);
    setSectionSemesters([]);
    setSectionMessage("");
    setSectionSemesterId("");
    setSectionName("");
    setSectionCapacity("60");
  };

  const handleFacultyMarksSubmit = async (e) => {
    e.preventDefault();
    setFacultyMarksMessage("");

    if (!facultyMarksStudentId || !facultyMarksSubjectId) {
      setFacultyMarksMessage("Please select a student and subject.");
      return;
    }

    try {
      setFacultyMarksLoading(true);
      const response = await fetch(
        `${API_URL}/faculty/marks?username=${encodeURIComponent(
          facultyProfile.username
        )}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            student_id: Number(facultyMarksStudentId),
            subject_id: Number(facultyMarksSubjectId),
            internal_marks: Number(facultyInternalMarks),
            external_marks: Number(facultyExternalMarks)
          })
        }
      );
      const data = await response.json();
      setFacultyMarksMessage(data.message || "Unable to record marks.");
    } catch (error) {
      console.error("Faculty Marks Error:", error);
      setFacultyMarksMessage("Unable to connect to the server.");
    } finally {
      setFacultyMarksLoading(false);
    }
  };

  // =========================
  // COMMON NAVIGATION
  // =========================

  const showDashboard = () => {
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setShowAdminManagement(false);
    setShowFacultyManagement(false);
    setShowCourseManagement(false);
    setShowSemesterManagement(false);
    setShowSubjectManagement(false);
    setShowSectionManagement(false);

    setSelectedCategory("");

    setChangePasswordMessage("");
    setChangePasswordSuccess(false);
  };

  // =========================
  // VIEW STUDENTS
  // =========================

  const handleOpenStudents = async () => {
    setShowStudents(true);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setSelectedCategory("");
    setSelectedStudentIds([]);

    try {
      const response = await fetch(
        `${API_URL}/students?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("View Students Error:", error);
    }
  };

  // =========================
  // ADD STUDENT
  // =========================

  const handleOpenAddStudent = () => {
    setShowAddStudent(true);
    setShowStudents(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setSelectedCategory("");

    setAddMessage("");
    setAddSuccess(false);
    setLastAddedStudent(null);
    setShowBulkStudentEntry(false);
    setBulkStudentMessage("");
    setBulkAddedStudents([]);
  };

  const updateBulkStudentRow = (index, field, value) => {
    setBulkStudentRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  };

  const addBulkStudentRow = () => {
    setBulkStudentRows((rows) => [
      ...rows,
      { name: "", email: "", gender: "", dob: "", department_id: "" },
    ]);
  };

  const removeBulkStudentRow = (index) => {
    setBulkStudentRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleBulkStudentKeyDown = (event, rowIndex, field) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    const fields = ["name", "email", "gender", "dob", "department_id"];
    const fieldIndex = fields.indexOf(field);
    const isLastField = fieldIndex === fields.length - 1;
    const nextRowIndex = isLastField ? rowIndex + 1 : rowIndex;
    const nextField = isLastField ? fields[0] : fields[fieldIndex + 1];

    if (isLastField && nextRowIndex >= bulkStudentRows.length) {
      addBulkStudentRow();
    }

    window.setTimeout(() => {
      document
        .querySelector(`[data-bulk-student-row="${nextRowIndex}"][data-bulk-student-field="${nextField}"]`)
        ?.focus();
    }, 0);
  };

  const handleBulkAddStudents = async (event) => {
    event.preventDefault();
    setBulkStudentMessage("");

    const rows = bulkStudentRows.filter((row) =>
      Object.values(row).some((value) => value.trim())
    );

    if (!rows.length || rows.some((row) => Object.values(row).some((value) => !value.trim()))) {
      setBulkStudentMessage("Complete every field in each student row before saving.");
      return;
    }

    try {
      setBulkStudentLoading(true);
      const results = [];

      for (const row of rows) {
        const response = await fetch(
          `${API_URL}/students?username=${encodeURIComponent(username)}`,
          {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              name: row.name.trim(),
              email: row.email.trim(),
              gender: row.gender,
              dob: row.dob,
              department_id: Number(row.department_id),
            }),
          }
        );
        results.push(await response.json());
      }

      const created = results.filter((result) => result.status === "success").length;
      const failed = results.length - created;
      setBulkAddedStudents(
        results
          .map((result, index) => ({ result, row: rows[index] }))
          .filter(({ result }) => result.status === "success")
          .map(({ result, row }) => ({
            student_id: result.student_id,
            name: result.name || row.name,
            email: result.email || row.email,
            gender: result.gender || row.gender,
            date_of_birth: result.date_of_birth || row.dob,
            department: result.department || row.department_id,
          }))
      );
      setBulkStudentMessage(
        `${created} student${created === 1 ? "" : "s"} added${failed ? `, ${failed} failed` : " successfully"}.`
      );
      if (!failed) {
        setBulkStudentRows([{ name: "", email: "", gender: "", dob: "", department_id: "" }]);
      }
    } catch (error) {
      console.error("Bulk Add Students Error:", error);
      setBulkStudentMessage("Unable to connect to server. Please make sure FastAPI is running.");
    } finally {
      setBulkStudentLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();

    setAddMessage("");
    setAddSuccess(false);

    if (
      !name.trim() ||
      !email.trim() ||
      !gender ||
      !dateOfBirth ||
      !departmentId
    ) {
      setAddMessage("Please fill all fields.");
      return;
    }

    try {
      setAddLoading(true);

      const response = await fetch(
        `${API_URL}/students?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            name: name.trim(),
            email: email.trim(),
            gender: gender,
            dob: dateOfBirth,
            department_id: Number(departmentId),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setAddSuccess(true);
        setAddMessage(data.message || "Student added successfully! 🎉");
        setLastAddedStudent(data);

        setName("");
        setEmail("");
        setGender("");
        setDateOfBirth("");
        setDepartmentId("");
      } else {
        setAddMessage(data.message || "Unable to add student.");
      }
    } catch (error) {
      console.error("Add Student Error:", error);

      setAddMessage(
        "Unable to connect to server. Please make sure FastAPI is running."
      );
    } finally {
      setAddLoading(false);
    }
  };

  // =========================
  // SEARCH STUDENT
  // =========================

  const handleOpenSearchStudent = () => {
    setShowSearchStudent(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setSelectedCategory("");

    setSearchValue("");
    setSearchResult(null);
    setSearchMessage("");
  };

  const handleSearchStudent = async (e) => {
    e.preventDefault();

    setSearchMessage("");
    setSearchResult(null);

    if (!searchValue.trim()) {
      setSearchMessage(
        searchType === "id"
          ? "Please enter a Student ID."
          : "Please enter a Student Name."
      );
      return;
    }

    try {
      setSearchLoading(true);

      let url = "";

      if (searchType === "id") {
        url = `${API_URL}/students/${searchValue.trim()}?username=${encodeURIComponent(
          username
        )}`;
      } else {
        url = `${API_URL}/students/name/${encodeURIComponent(
          searchValue.trim()
        )}?username=${encodeURIComponent(username)}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.status !== "error") {
        setSearchResult(data.student);
      } else {
        setSearchMessage(data.message || "Student not found.");
      }
    } catch (error) {
      console.error("Search Student Error:", error);

      setSearchMessage(
        "Unable to connect to server. Please make sure FastAPI is running."
      );
    } finally {
      setSearchLoading(false);
    }
  };

  // =========================
  // UPDATE STUDENT
  // =========================

  const handleOpenUpdateStudent = () => {
    setShowUpdateStudent(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setSelectedCategory("");

    setUpdateMessage("");
    setUpdateSuccess(false);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();

    setUpdateMessage("");
    setUpdateSuccess(false);

    if (
      !updateId.trim() ||
      !updateName.trim() ||
      !updateEmail.trim() ||
      !updateGender ||
      !updateDateOfBirth ||
      !updateDepartmentId
    ) {
      setUpdateMessage("Please fill all fields.");
      return;
    }

    try {
      setUpdateLoading(true);

      const response = await fetch(
        `${API_URL}/students/${updateId.trim()}?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            name: updateName.trim(),
            email: updateEmail.trim(),
            gender: updateGender,
            dob: updateDateOfBirth,
            department_id: Number(updateDepartmentId),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setUpdateSuccess(true);
        setUpdateMessage(
          data.message || "Student updated successfully! ✏️"
        );
      } else {
        setUpdateMessage(data.message || "Unable to update student.");
      }
    } catch (error) {
      console.error("Update Student Error:", error);

      setUpdateMessage(
        "Unable to connect to server. Please make sure FastAPI is running."
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  // =========================
  // DELETE STUDENT
  // =========================

  const handleOpenDeleteStudent = () => {
    setShowDeleteStudent(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setSelectedCategory("");

    setDeleteMessage("");
    setDeleteSuccess(false);
  };

  const handleDeleteStudent = async (e) => {
    e.preventDefault();

    setDeleteMessage("");
    setDeleteSuccess(false);

    if (!deleteValue.trim()) {
      setDeleteMessage(
        deleteType === "id"
          ? "Please enter a Student ID."
          : "Please enter a Student Name."
      );
      return;
    }

    if (deleteType === "id" && !/^\d+$/.test(deleteValue.trim())) {
      setDeleteMessage("Student ID must contain numbers only.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this student by ${
        deleteType === "id" ? "ID" : "name"
      }?\n\n${deleteValue.trim()}`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeleteLoading(true);

      let url = "";

      if (deleteType === "id") {
        url = `${API_URL}/students/${deleteValue.trim()}?username=${encodeURIComponent(
          username
        )}`;
      } else {
        url = `${API_URL}/students/name/${encodeURIComponent(
          deleteValue.trim()
        )}?username=${encodeURIComponent(username)}`;
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json();

      console.log("Delete Student Response:", data);

      if (
        response.ok &&
        data.status === "success" &&
        data.message !== "Student not found"
      ) {
        setDeleteSuccess(true);

        setDeleteMessage(
          data.message || "Student deleted successfully! 🗑️"
        );

        setDeleteValue("");
      } else {
        setDeleteMessage(data.message || "Unable to delete student.");
      }
    } catch (error) {
      console.error("Delete Student Error:", error);

      setDeleteMessage(
        "Unable to connect to server. Please make sure FastAPI is running."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((ids) =>
      ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId]
    );
  };

  const handleDeleteSelectedStudents = async () => {
    if (!selectedStudentIds.length) return;
    if (!window.confirm(`Delete ${selectedStudentIds.length} selected student(s)?`)) return;

    try {
      const results = await Promise.all(
        selectedStudentIds.map((studentId) =>
          fetch(
            `${API_URL}/students/${studentId}?username=${encodeURIComponent(username)}`,
            { method: "DELETE", headers: { Accept: "application/json" } }
          ).then((response) => response.json())
        )
      );
      const deleted = results.filter((result) => result.status === "success").length;
      setSelectedStudentIds([]);
      setDeleteMessage(`${deleted} student${deleted === 1 ? "" : "s"} deleted successfully.`);
      await handleOpenStudents();
    } catch (error) {
      console.error("Bulk Delete Students Error:", error);
      setDeleteMessage("Unable to delete the selected students.");
    }
  };

  const handleBulkDeleteStudents = async (event) => {
    event.preventDefault();
    const rows = bulkDeleteRows.map((row) => row.value.trim()).filter(Boolean);
    if (!rows.length || (deleteType === "id" && rows.some((value) => !/^\d+$/.test(value)))) {
      setDeleteMessage(deleteType === "id" ? "Enter valid numeric student IDs." : "Enter at least one student name.");
      return;
    }
    if (!window.confirm(`Delete ${rows.length} student record(s)?`)) return;

    try {
      setBulkDeleteLoading(true);
      const results = [];
      for (const value of rows) {
        const url = deleteType === "id"
          ? `${API_URL}/students/${value}?username=${encodeURIComponent(username)}`
          : `${API_URL}/students/name/${encodeURIComponent(value)}?username=${encodeURIComponent(username)}`;
        const response = await fetch(url, { method: "DELETE", headers: { Accept: "application/json" } });
        results.push({ value, result: await response.json() });
      }
      const deleted = results.filter(({ result }) => result.status === "success").length;
      setBulkDeleteResults(results);
      setDeleteSuccess(deleted > 0);
      setDeleteMessage(`${deleted} of ${rows.length} student records deleted.`);
      setBulkDeleteRows([{ value: "" }]);
    } catch (error) {
      console.error("Bulk Delete Students Error:", error);
      setDeleteMessage("Unable to connect to server.");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // =========================
  // DASHBOARD STATISTICS
  // =========================

  const handleOpenDashboardStats = async () => {
    setShowDashboardStats(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setSelectedCategory("");

    setStatsMessage("");
    setStatsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/students?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      console.log("Dashboard Statistics Response:", data);

      if (response.ok) {
        setStudents(data.students || []);
      } else {
        setStudents([]);
        setStatsMessage(
          data.message || "Unable to load dashboard statistics."
        );
      }
    } catch (error) {
      console.error("Dashboard Statistics Error:", error);

      setStudents([]);

      setStatsMessage(
        "Unable to connect to server. Please make sure FastAPI is running."
      );
    } finally {
      setStatsLoading(false);
    }
  };

  // =========================
  // CHANGE PASSWORD
  // =========================

  const handleOpenChangePassword = () => {
    setShowChangePassword(true);

    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setSelectedCategory("");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordMessage("");
    setChangePasswordSuccess(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    setChangePasswordMessage("");
    setChangePasswordSuccess(false);

    if (!currentPassword.trim()) {
      setChangePasswordMessage("Please enter your current password.");
      return;
    }

    if (!newPassword.trim()) {
      setChangePasswordMessage("Please enter your new password.");
      return;
    }

    if (!confirmPassword.trim()) {
      setChangePasswordMessage("Please confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordMessage("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setChangePasswordMessage(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setChangePasswordMessage(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setChangePasswordMessage(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setChangePasswordMessage(
        "Password must contain at least one number."
      );
      return;
    }

    try {
      setChangePasswordLoading(true);

      const response = await fetch(
        `${API_URL}/admin/change-password?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        }
      );

      const data = await response.json();

      console.log("Change Password Response:", data);

      if (response.ok && data.status === "success") {
        setChangePasswordSuccess(true);

        setChangePasswordMessage(
          data.message || "Password changed successfully! 🔐"
        );

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setChangePasswordMessage(
          data.message || "Unable to change password."
        );
      }
    } catch (error) {
      console.error("Change Password Error:", error);

      setChangePasswordMessage(
        "Unable to connect to server. Please make sure FastAPI is running."
      );
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // =========================
  // ADMIN PROFILE
  // =========================

  const handleOpenAdminProfile = () => {
    setShowAdminProfile(true);

    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowActivityLogs(false);
    setSelectedCategory("");

    setChangePasswordMessage("");
    setChangePasswordSuccess(false);
  };

  // =========================
  // ACTIVITY LOGS
  // =========================

  const handleOpenActivityLogs = async () => {
    setShowActivityLogs(true);

    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setSelectedCategory("");

    setActivityLogs([]);
    setActivityLogsMessage("");
    setActivityLogsLoading(true);

    try {
      console.log("Loading Activity Logs...");

      const response = await fetch(
        `${API_URL}/admin/activity-logs?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      console.log(
        "Activity Logs HTTP Status:",
        response.status
      );

      const responseText = await response.text();

      console.log(
        "Activity Logs Raw Response:",
        responseText
      );

      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "Activity Logs JSON Parse Error:",
          parseError
        );

        setActivityLogs([]);
        setActivityLogsMessage(
          "Server returned an invalid response."
        );
        return;
      }

      console.log(
        "Activity Logs Parsed Data:",
        data
      );

      if (
        response.ok &&
        (
          data.status === "success" ||
          Array.isArray(data.logs)
        )
      ) {
        setActivityLogs(
          Array.isArray(data.logs)
            ? data.logs
            : []
        );

        setActivityLogsMessage("");
      } else {
        setActivityLogs([]);

        const errorMessage = Array.isArray(data.detail)
          ? data.detail
              .map((item) => item.msg || item.message || "Validation error")
              .join(", ")
          : data.detail || data.message;

        setActivityLogsMessage(
          errorMessage ||
            `Unable to load activity logs. Server returned ${response.status}.`
        );
      }
    } catch (error) {
      console.error(
        "Activity Logs Fetch Error:",
        error
      );

      setActivityLogs([]);
      setActivityLogsMessage(
        "Unable to connect to FastAPI server. Please make sure FastAPI is running."
      );
    } finally {
      setActivityLogsLoading(false);
    }
  };

  // =========================
  // ADMIN MANAGEMENT
  // =========================

  const handleOpenAdminManagement = async () => {
    setShowAdminManagement(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setAdminAccountsMessage("");
    setAdminAccountsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/admin/accounts?username=${encodeURIComponent(
          username
        )}`
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setAdminAccounts(data.admins || []);
      } else {
        setAdminAccounts([]);
        setAdminAccountsMessage(
          data.message || "Unable to load admin accounts."
        );
      }
    } catch (error) {
      console.error("Admin Accounts Error:", error);
      setAdminAccounts([]);
      setAdminAccountsMessage(
        "Unable to connect to FastAPI server."
      );
    } finally {
      setAdminAccountsLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminAccountsMessage("");

    if (
      !newAdminUsername.trim() ||
      !newAdminPassword ||
      !newAdminConfirmPassword
    ) {
      setAdminAccountsMessage("Please fill all admin account fields.");
      return;
    }

    try {
      setCreateAdminLoading(true);

      const response = await fetch(
        `${API_URL}/admin/accounts?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: newAdminUsername.trim(),
            password: newAdminPassword,
            confirm_password: newAdminConfirmPassword,
            role: newAdminRole,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setAdminAccountsMessage(data.message);
        setNewAdminUsername("");
        setNewAdminPassword("");
        setNewAdminConfirmPassword("");
        setNewAdminRole("Staff");
        await handleOpenAdminManagement();
        setAdminAccountsMessage(data.message);
      } else {
        setAdminAccountsMessage(
          data.message || "Unable to create admin account."
        );
      }
    } catch (error) {
      console.error("Create Admin Error:", error);
      setAdminAccountsMessage(
        "Unable to connect to FastAPI server."
      );
    } finally {
      setCreateAdminLoading(false);
    }
  };

  const handleBulkCreateAdmins = async (event) => {
    event.preventDefault();
    setAdminAccountsMessage("");
    const rows = bulkAdminRows.filter((row) =>
      Object.values(row).some((value) => value.trim())
    );

    if (!rows.length || rows.some((row) => Object.values(row).some((value) => !value.trim()))) {
      setAdminAccountsMessage("Complete every field in each admin row before saving.");
      return;
    }

    try {
      setBulkAdminLoading(true);
      const results = [];
      for (const row of rows) {
        const response = await fetch(
          `${API_URL}/admin/accounts?username=${encodeURIComponent(username)}`,
          {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(row),
          }
        );
        results.push(await response.json());
      }
      const created = results.filter((result) => result.status === "success").length;
      const failed = results.length - created;
      setBulkAdminResults(
        results
          .filter((result) => result.status === "success")
          .map((result) => result.admin)
          .filter(Boolean)
      );
      setAdminAccountsMessage(
        `${created} admin${created === 1 ? "" : "s"} added${failed ? `, ${failed} failed` : " successfully"}.`
      );
      if (!failed) {
        setBulkAdminRows([{ username: "", password: "", confirm_password: "", role: "Staff" }]);
      }
      await handleOpenAdminManagement();
      setAdminAccountsMessage(
        `${created} admin${created === 1 ? "" : "s"} added${failed ? `, ${failed} failed` : " successfully"}.`
      );
    } catch (error) {
      console.error("Bulk Create Admins Error:", error);
      setAdminAccountsMessage("Unable to connect to server.");
    } finally {
      setBulkAdminLoading(false);
    }
  };

  const handleToggleAdminStatus = async (adminId) => {
    setAdminActionLoadingId(adminId);

    try {
      const response = await fetch(
        `${API_URL}/admin/accounts/${adminId}/status?username=${encodeURIComponent(
          username
        )}`,
        { method: "PUT" }
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        await handleOpenAdminManagement();
        setAdminAccountsMessage(data.message);
      } else {
        setAdminAccountsMessage(
          data.message || "Unable to change admin status."
        );
      }
    } catch (error) {
      console.error("Admin Status Error:", error);
      setAdminAccountsMessage(
        "Unable to connect to FastAPI server."
      );
    } finally {
      setAdminActionLoadingId(null);
    }
  };

  const handleUpdateAdminRole = async (adminId, role) => {
    setAdminActionLoadingId(adminId);

    try {
      const response = await fetch(
        `${API_URL}/admin/accounts/${adminId}/role?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        }
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        await handleOpenAdminManagement();
        setAdminAccountsMessage(data.message);
      } else {
        setAdminAccountsMessage(
          data.message || "Unable to change admin role."
        );
      }
    } catch (error) {
      console.error("Admin Role Error:", error);
      setAdminAccountsMessage(
        "Unable to connect to FastAPI server."
      );
    } finally {
      setAdminActionLoadingId(null);
    }
  };

  // =========================
  // FACULTY MANAGEMENT
  // =========================

  const handleOpenFacultyManagement = async () => {
    setShowFacultyManagement(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setShowAdminManagement(false);
    setFacultyMessage("");
    setFacultyLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/admin/faculty?username=${encodeURIComponent(
          username
        )}`
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setFacultyMembers(data.faculty || []);
      } else {
        setFacultyMembers([]);
        setFacultyMessage(
          data.message || "Unable to load faculty members."
        );
      }
    } catch (error) {
      console.error("Faculty Error:", error);
      setFacultyMembers([]);
      setFacultyMessage("Unable to connect to FastAPI server.");
    } finally {
      setFacultyLoading(false);
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setFacultyMessage("");

    if (
      !facultyName.trim() ||
      !facultyEmail.trim() ||
      !facultyPhone.trim() ||
      !facultyDepartmentId ||
      !facultyDesignation.trim() ||
      !facultyUsername.trim() ||
      !facultyPassword ||
      !facultyConfirmPassword
    ) {
      setFacultyMessage("Please fill all faculty fields.");
      return;
    }

    try {
      setCreateFacultyLoading(true);

      const response = await fetch(
        `${API_URL}/admin/faculty?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: facultyName.trim(),
            email: facultyEmail.trim(),
            phone: facultyPhone.trim(),
            department_id: Number(facultyDepartmentId),
            designation: facultyDesignation.trim(),
            username: facultyUsername.trim(),
            password: facultyPassword,
            confirm_password: facultyConfirmPassword,
          }),
        }
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setFacultyName("");
        setFacultyEmail("");
        setFacultyPhone("");
        setFacultyDepartmentId("");
        setFacultyDesignation("");
        setFacultyUsername("");
        setFacultyPassword("");
        setFacultyConfirmPassword("");
        await handleOpenFacultyManagement();
        setFacultyMessage(data.message);
      } else {
        setFacultyMessage(
          data.message || "Unable to create faculty member."
        );
      }
    } catch (error) {
      console.error("Create Faculty Error:", error);
      setFacultyMessage("Unable to connect to FastAPI server.");
    } finally {
      setCreateFacultyLoading(false);
    }
  };

  const handleBulkCreateFaculty = async (event) => {
    event.preventDefault();
    setFacultyMessage("");
    const rows = bulkFacultyRows.filter((row) => Object.values(row).some((value) => value.trim()));
    if (!rows.length || rows.some((row) => Object.values(row).some((value) => !value.trim()))) {
      setFacultyMessage("Complete every field in each faculty row before saving.");
      return;
    }

    try {
      setBulkFacultyLoading(true);
      const results = [];
      for (const row of rows) {
        const response = await fetch(`${API_URL}/admin/faculty?username=${encodeURIComponent(username)}`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ ...row, department_id: Number(row.department_id) }),
        });
        results.push(await response.json());
      }
      const created = results.filter((result) => result.status === "success").length;
      setBulkFacultyResults(results.filter((result) => result.status === "success").map((result) => result.faculty || result.data).filter(Boolean));
      setFacultyMessage(`${created} of ${rows.length} faculty records added.`);
      if (created === rows.length) setBulkFacultyRows([{ name: "", email: "", phone: "", department_id: "", designation: "", username: "", password: "", confirm_password: "" }]);
      await handleOpenFacultyManagement();
      setFacultyMessage(`${created} of ${rows.length} faculty records added.`);
    } catch (error) {
      console.error("Bulk Create Faculty Error:", error);
      setFacultyMessage("Unable to connect to server.");
    } finally {
      setBulkFacultyLoading(false);
    }
  };

  // =========================
  // COURSE MANAGEMENT
  // =========================

  const handleOpenCourseManagement = async () => {
    setShowCourseManagement(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setShowAdminManagement(false);
    setShowFacultyManagement(false);
    setCourseMessage("");
    setCoursesLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/admin/courses?username=${encodeURIComponent(
          username
        )}`
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setCourses(data.courses || []);
      } else {
        setCourses([]);
        setCourseMessage(data.message || "Unable to load courses.");
      }
    } catch (error) {
      console.error("Courses Error:", error);
      setCourses([]);
      setCourseMessage("Unable to connect to FastAPI server.");
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCourseMessage("");

    if (!courseDepartmentId || !courseName.trim() || !courseCode.trim()) {
      setCourseMessage("Please fill all course fields.");
      return;
    }

    try {
      setCreateCourseLoading(true);

      const response = await fetch(
        `${API_URL}/admin/courses?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            department_id: Number(courseDepartmentId),
            name: courseName.trim(),
            code: courseCode.trim().toUpperCase(),
            duration_years: Number(courseDuration),
          }),
        }
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setCourseName("");
        setCourseCode("");
        setCourseDepartmentId("");
        setCourseDuration("3");
        await handleOpenCourseManagement();
        setCourseMessage(data.message);
      } else {
        setCourseMessage(data.message || "Unable to create course.");
      }
    } catch (error) {
      console.error("Create Course Error:", error);
      setCourseMessage("Unable to connect to FastAPI server.");
    } finally {
      setCreateCourseLoading(false);
    }
  };

  // =========================
  // SEMESTER MANAGEMENT
  // =========================

  const handleOpenSemesterManagement = async () => {
    setShowSemesterManagement(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setShowAdminManagement(false);
    setShowFacultyManagement(false);
    setShowCourseManagement(false);
    setSemesterMessage("");
    setSemestersLoading(true);

    try {
      const [semesterResponse, courseResponse] = await Promise.all([
        fetch(
          `${API_URL}/admin/semesters?username=${encodeURIComponent(
            username
          )}`
        ),
        fetch(
          `${API_URL}/admin/courses?username=${encodeURIComponent(
            username
          )}`
        ),
      ]);
      const semesterData = await semesterResponse.json();
      const courseData = await courseResponse.json();

      if (semesterResponse.ok && semesterData.status === "success") {
        setSemesters(semesterData.semesters || []);
      } else {
        setSemesters([]);
        setSemesterMessage(
          semesterData.message || "Unable to load semesters."
        );
      }

      if (courseResponse.ok && courseData.status === "success") {
        setSemesterCourses(courseData.courses || []);
      }
    } catch (error) {
      console.error("Semesters Error:", error);
      setSemesters([]);
      setSemesterCourses([]);
      setSemesterMessage("Unable to connect to FastAPI server.");
    } finally {
      setSemestersLoading(false);
    }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    setSemesterMessage("");

    if (!semesterCourseId || !semesterNumber || !semesterName.trim()) {
      setSemesterMessage("Please fill all semester fields.");
      return;
    }

    try {
      setCreateSemesterLoading(true);
      const response = await fetch(
        `${API_URL}/admin/semesters?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            course_id: Number(semesterCourseId),
            semester_number: Number(semesterNumber),
            name: semesterName.trim(),
          }),
        }
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setSemesterCourseId("");
        setSemesterNumber("1");
        setSemesterName("");
        await handleOpenSemesterManagement();
        setSemesterMessage(data.message);
      } else {
        setSemesterMessage(data.message || "Unable to create semester.");
      }
    } catch (error) {
      console.error("Create Semester Error:", error);
      setSemesterMessage("Unable to connect to FastAPI server.");
    } finally {
      setCreateSemesterLoading(false);
    }
  };

  // =========================
  // SUBJECT MANAGEMENT
  // =========================

  const handleOpenSubjectManagement = async () => {
    setShowSubjectManagement(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setShowAdminManagement(false);
    setShowFacultyManagement(false);
    setShowCourseManagement(false);
    setShowSemesterManagement(false);
    setSubjectMessage("");
    setSubjectsLoading(true);

    try {
      const [subjectResponse, semesterResponse] = await Promise.all([
        fetch(`${API_URL}/admin/subjects?username=${encodeURIComponent(username)}`),
        fetch(`${API_URL}/admin/semesters?username=${encodeURIComponent(username)}`),
      ]);
      const subjectData = await subjectResponse.json();
      const semesterData = await semesterResponse.json();

      if (subjectResponse.ok && subjectData.status === "success") {
        setSubjects(subjectData.subjects || []);
      } else {
        setSubjects([]);
        setSubjectMessage(subjectData.message || "Unable to load subjects.");
      }

      if (semesterResponse.ok && semesterData.status === "success") {
        setSubjectSemesters(semesterData.semesters || []);
      }
    } catch (error) {
      console.error("Subjects Error:", error);
      setSubjects([]);
      setSubjectSemesters([]);
      setSubjectMessage("Unable to connect to FastAPI server.");
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setSubjectMessage("");

    if (!subjectSemesterId || !subjectName.trim() || !subjectCode.trim()) {
      setSubjectMessage("Please fill all subject fields.");
      return;
    }

    try {
      setCreateSubjectLoading(true);
      const response = await fetch(
        `${API_URL}/admin/subjects?username=${encodeURIComponent(username)}`,
        {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            semester_id: Number(subjectSemesterId),
            name: subjectName.trim(),
            code: subjectCode.trim().toUpperCase(),
            credits: Number(subjectCredits),
          }),
        }
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setSubjectSemesterId("");
        setSubjectName("");
        setSubjectCode("");
        setSubjectCredits("3");
        await handleOpenSubjectManagement();
        setSubjectMessage(data.message);
      } else {
        setSubjectMessage(data.message || "Unable to create subject.");
      }
    } catch (error) {
      console.error("Create Subject Error:", error);
      setSubjectMessage("Unable to connect to FastAPI server.");
    } finally {
      setCreateSubjectLoading(false);
    }
  };

  // =========================
  // SECTION MANAGEMENT
  // =========================

  const handleOpenSectionManagement = async () => {
    setShowSectionManagement(true);
    setShowStudents(false);
    setShowAddStudent(false);
    setShowSearchStudent(false);
    setShowUpdateStudent(false);
    setShowDeleteStudent(false);
    setShowDashboardStats(false);
    setShowChangePassword(false);
    setShowAdminProfile(false);
    setShowActivityLogs(false);
    setShowAdminManagement(false);
    setShowFacultyManagement(false);
    setShowCourseManagement(false);
    setShowSemesterManagement(false);
    setShowSubjectManagement(false);
    setSectionMessage("");
    setSectionsLoading(true);

    try {
      const [sectionResponse, semesterResponse] = await Promise.all([
        fetch(`${API_URL}/admin/sections?username=${encodeURIComponent(username)}`),
        fetch(`${API_URL}/admin/semesters?username=${encodeURIComponent(username)}`),
      ]);
      const sectionData = await sectionResponse.json();
      const semesterData = await semesterResponse.json();

      if (sectionResponse.ok && sectionData.status === "success") {
        setSections(sectionData.sections || []);
      } else {
        setSections([]);
        setSectionMessage(sectionData.message || "Unable to load sections.");
      }

      if (semesterResponse.ok && semesterData.status === "success") {
        setSectionSemesters(semesterData.semesters || []);
      }
    } catch (error) {
      console.error("Sections Error:", error);
      setSections([]);
      setSectionSemesters([]);
      setSectionMessage("Unable to connect to FastAPI server.");
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setSectionMessage("");

    if (!sectionSemesterId || !sectionName.trim()) {
      setSectionMessage("Please fill all section fields.");
      return;
    }

    try {
      setCreateSectionLoading(true);
      const response = await fetch(
        `${API_URL}/admin/sections?username=${encodeURIComponent(username)}`,
        {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            semester_id: Number(sectionSemesterId),
            name: sectionName.trim(),
            capacity: Number(sectionCapacity),
          }),
        }
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setSectionSemesterId("");
        setSectionName("");
        setSectionCapacity("60");
        await handleOpenSectionManagement();
        setSectionMessage(data.message);
      } else {
        setSectionMessage(data.message || "Unable to create section.");
      }
    } catch (error) {
      console.error("Create Section Error:", error);
      setSectionMessage("Unable to connect to FastAPI server.");
    } finally {
      setCreateSectionLoading(false);
    }
  };

  // =========================
  // OPEN CATEGORY STUDENTS
  // =========================

  const handleOpenCategory = (category) => {
    setSelectedCategory(category);
  };

  const handleBackToStatistics = () => {
    setSelectedCategory("");
  };

  // =========================
  // FILTER STATISTICS
  // =========================

  const getFilteredStudents = () => {
    switch (selectedCategory) {
      case "Total Students":
        return students;

      case "Male Students":
        return students.filter(
          (student) => student[3] === "Male"
        );

      case "Female Students":
        return students.filter(
          (student) => student[3] === "Female"
        );

      case "Other Gender":
        return students.filter(
          (student) => student[3] === "Other"
        );

      case "BCA Students":
        return students.filter(
          (student) => student[6] === "BCA"
        );

      case "BBA Students":
        return students.filter(
          (student) => student[6] === "BBA"
        );

      case "B.Tech Students":
        return students.filter(
          (student) => student[6] === "B.Tech"
        );

      case "MCA Students":
        return students.filter(
          (student) => student[6] === "MCA"
        );

      default:
        return [];
    }
  };

  // =========================
  // LOGIN PAGE
  // =========================

  if (!loggedIn && !facultyLoggedIn && !studentLoggedIn) {
    return (
      <div className={`login-page login-${loginType}`}>
        <div className="login-card">
          <div className="login-brand-panel">
            <img
              className="login-hero-image"
              src={loginType === "admin" ? adminImage : loginType === "faculty" ? facultyImage : studentImage}
              alt=""
              aria-hidden="true"
            />
            <div className="login-icon">🎓</div>
            <span className="login-eyebrow">Campus workspace</span>
            <h1>Student Management System</h1>
            <p>Everything your academic community needs, in one calm and secure place.</p>
            <div className="login-brand-note">
              <span className="login-status-dot" />
              {loginType === "admin"
                ? "Secure administrator access"
                : loginType === "faculty"
                  ? "Faculty workspace access"
                  : "Student learning access"}
            </div>
          </div>

          <div className="login-form-panel">
            <p className="login-kicker">Welcome back</p>
            <h2>
              {loginType === "admin"
                ? "Administrator Login"
                : loginType === "faculty"
                  ? "Faculty Login"
                  : "Student Login"}
            </h2>
            <p className="subtitle">Sign in to continue to your portal.</p>

            <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Login As</label>
              <select
                className="login-role-select"
                value={loginType}
                onChange={(e) => {
                  setLoginType(e.target.value);
                  setLoginMessage("");
                }}
              >
                <option value="admin">Administrator</option>
                <option value="faculty">Faculty</option>
                <option value="student">Student</option>
              </select>
            </div>

            <div className="input-group">
              <label>Username</label>

              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
              />
            </div>

            <div className="input-group">
              <label>Password</label>

              <div className="password-box">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {loginMessage && (
              <p className="message">
                {loginMessage}
              </p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "🔐 Login"}
            </button>
            </form>

            <p className="footer-text">Student Management System · 2026</p>
          </div>
        </div>
      </div>
    );
  }

  if (facultyLoggedIn && facultyProfile) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>🎓 College ERP System</h1>
            <p>Faculty Portal</p>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <h2>Welcome, {facultyProfile.name}</h2>

          <div className="table-container">
            <table>
              <tbody>
                <tr><th>Faculty ID</th><td>{facultyProfile.id}</td></tr>
                <tr><th>Name</th><td>{facultyProfile.name}</td></tr>
                <tr><th>Email</th><td>{facultyProfile.email}</td></tr>
                <tr><th>Phone</th><td>{facultyProfile.phone}</td></tr>
                <tr><th>Department</th><td>{facultyProfile.department}</td></tr>
                <tr><th>Designation</th><td>{facultyProfile.designation}</td></tr>
                <tr><th>Status</th><td>{facultyProfile.account_status}</td></tr>
              </tbody>
            </table>
          </div>

          <h2>Record Attendance</h2>
          <form onSubmit={handleFacultyAttendanceSubmit}>
            <div className="input-group">
              <label>Student</label>
              <select
                value={facultyAttendanceStudentId}
                onChange={(event) => {
                  setFacultyAttendanceStudentId(event.target.value);
                  setFacultyAttendanceSubjectId("");
                }}
              >
                <option value="">Select student</option>
                {facultyAttendanceStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.id} - {student.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Subject</label>
              <select
                value={facultyAttendanceSubjectId}
                onChange={(event) => setFacultyAttendanceSubjectId(event.target.value)}
              >
                <option value="">Select subject</option>
                {facultyAttendanceSubjects
                  .filter((subject) => {
                    const student = facultyAttendanceStudents.find(
                      (item) => String(item.id) === facultyAttendanceStudentId
                    );
                    return student && subject.semester_id === student.semester_id;
                  })
                  .map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="input-group">
              <label>Date</label>
              <input
                type="date"
                value={facultyAttendanceDate}
                onChange={(event) => setFacultyAttendanceDate(event.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Status</label>
              <select
                value={facultyAttendanceStatus}
                onChange={(event) => setFacultyAttendanceStatus(event.target.value)}
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            {facultyAttendanceMessage && (
              <p className="message">{facultyAttendanceMessage}</p>
            )}

            <button type="submit" className="login-button" disabled={facultyAttendanceLoading}>
              {facultyAttendanceLoading ? "Saving..." : "Save Attendance"}
            </button>
          </form>

          <h2>Record Marks</h2>
          <form onSubmit={handleFacultyMarksSubmit}>
            <div className="input-group">
              <label>Student</label>
              <select
                value={facultyMarksStudentId}
                onChange={(event) => {
                  setFacultyMarksStudentId(event.target.value);
                  setFacultyMarksSubjectId("");
                }}
              >
                <option value="">Select student</option>
                {facultyAttendanceStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.id} - {student.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Subject</label>
              <select
                value={facultyMarksSubjectId}
                onChange={(event) => setFacultyMarksSubjectId(event.target.value)}
              >
                <option value="">Select subject</option>
                {facultyAttendanceSubjects
                  .filter((subject) => {
                    const student = facultyAttendanceStudents.find(
                      (item) => String(item.id) === facultyMarksStudentId
                    );
                    return student && subject.semester_id === student.semester_id;
                  })
                  .map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="input-group">
              <label>Internal Marks (0-40)</label>
              <input
                type="number"
                min="0"
                max="40"
                step="0.01"
                value={facultyInternalMarks}
                onChange={(event) => setFacultyInternalMarks(event.target.value)}
              />
            </div>

            <div className="input-group">
              <label>External Marks (0-70)</label>
              <input
                type="number"
                min="0"
                max="70"
                step="0.01"
                value={facultyExternalMarks}
                onChange={(event) => setFacultyExternalMarks(event.target.value)}
              />
            </div>

            {facultyMarksMessage && <p className="message">{facultyMarksMessage}</p>}

            <button type="submit" className="login-button" disabled={facultyMarksLoading}>
              {facultyMarksLoading ? "Saving..." : "Save Marks"}
            </button>
          </form>

          {facultyPortalMessage && <p className="message">{facultyPortalMessage}</p>}

          <h2>Faculty Timetable</h2>
          {facultyTimetable.length === 0 ? (
            <p className="message">No timetable entries found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Room</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyTimetable.map((entry, index) => (
                    <tr key={`${entry.code}-${entry.day}-${index}`}>
                      <td>{entry.day}</td>
                      <td>{entry.start_time} - {entry.end_time}</td>
                      <td>{entry.code} - {entry.subject}</td>
                      <td>{entry.room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>Published Notices</h2>
          {facultyNotices.length === 0 ? (
            <p className="message">No notices published.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Content</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyNotices.map((notice) => (
                    <tr key={notice.id}>
                      <td>{notice.title}</td>
                      <td>{notice.notice_type}</td>
                      <td>{notice.content}</td>
                      <td>{notice.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>My Students</h2>
          {facultyStudentsLoading ? (
            <p className="message">Loading students...</p>
          ) : facultyStudentsMessage ? (
            <p className="message">{facultyStudentsMessage}</p>
          ) : facultyStudents.length === 0 ? (
            <p className="message">No active students found in your department.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Gender</th>
                    <th>Date of Birth</th>
                    <th>Semester</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.id}</td>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.gender}</td>
                      <td>{student.date_of_birth}</td>
                      <td>{student.semester}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          College ERP System © 2026
        </footer>
      </div>
    );
  }

  if (studentLoggedIn && studentProfile) {
    return (
      <div className="dashboard-page theme-student">
        <header className="dashboard-header">
          <div>
            <h1>🎓 College ERP System</h1>
            <p>Student Portal</p>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <h2>Welcome, {studentProfile.name}</h2>
          <p className="message">
            Student login is working. Academic student modules will be added
            next.
          </p>

          <div className="table-container">
            <table>
              <tbody>
                <tr><th>Student ID</th><td>{studentProfile.id}</td></tr>
                <tr><th>Name</th><td>{studentProfile.name}</td></tr>
                <tr><th>Email</th><td>{studentProfile.email}</td></tr>
                <tr><th>Gender</th><td>{studentProfile.gender}</td></tr>
                <tr><th>Date of Birth</th><td>{studentProfile.date_of_birth}</td></tr>
                <tr><th>Department</th><td>{studentProfile.department || "Not assigned"}</td></tr>
                <tr><th>Status</th><td>{studentProfile.account_status}</td></tr>
              </tbody>
            </table>
          </div>

          <h2>My Subjects</h2>
          {studentSubjects.length === 0 ? (
            <p className="message">No subjects assigned.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Course</th>
                    <th>Semester</th>
                    <th>Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSubjects.map((subject) => (
                    <tr key={subject.id}>
                      <td>{subject.name}</td>
                      <td>{subject.code}</td>
                      <td>{subject.course_code}</td>
                      <td>{subject.semester}</td>
                      <td>{subject.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>My Attendance</h2>
          {studentAttendance.length === 0 ? (
            <p className="message">No attendance records found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Total</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {studentAttendance.map((attendance) => (
                    <tr key={attendance.code}>
                      <td>{attendance.name}</td>
                      <td>{attendance.present_classes}</td>
                      <td>{attendance.absent_classes}</td>
                      <td>{attendance.total_classes}</td>
                      <td>{attendance.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>My Marks</h2>
          {studentMarks.length === 0 ? (
            <p className="message">No marks found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Internal</th>
                    <th>External</th>
                    <th>Total</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {studentMarks.map((mark) => (
                    <tr key={mark.code}>
                      <td>{mark.name}</td>
                      <td>{mark.internal_marks}</td>
                      <td>{mark.external_marks}</td>
                      <td>{mark.total}</td>
                      <td>{mark.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>My Result</h2>
          {!studentResult || studentResult.subjects?.length === 0 ? (
            <p className="message">Result is not available yet.</p>
          ) : (
            <div className="table-container">
              <table>
                <tbody>
                  <tr><th>Total Marks</th><td>{studentResult.total_marks} / {studentResult.maximum_marks}</td></tr>
                  <tr><th>Percentage</th><td>{studentResult.percentage}%</td></tr>
                  <tr><th>Result</th><td>{studentResult.result}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          <h2>My Timetable</h2>
          {studentTimetable.length === 0 ? (
            <p className="message">No timetable entries found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Day</th><th>Time</th><th>Subject</th><th>Room</th></tr>
                </thead>
                <tbody>
                  {studentTimetable.map((entry, index) => (
                    <tr key={`${entry.code}-${entry.day}-${index}`}>
                      <td>{entry.day}</td>
                      <td>{entry.start_time} - {entry.end_time}</td>
                      <td>{entry.subject}</td>
                      <td>{entry.room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>Notices</h2>
          {studentNotices.length === 0 ? (
            <p className="message">No notices published.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Title</th><th>Type</th><th>Notice</th><th>Date</th></tr></thead>
                <tbody>
                  {studentNotices.map((notice) => (
                    <tr key={notice.id}>
                      <td>{notice.title}</td>
                      <td>{notice.notice_type}</td>
                      <td>{notice.content}</td>
                      <td>{notice.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">College ERP System © 2026</footer>
      </div>
    );
  }

  // =========================
  // ACTIVITY LOGS PAGE
  // =========================

  if (showActivityLogs) {
    return (
      <div className="dashboard-page theme-logs">
        <header className="dashboard-header">
          <div>
            <h1>🎓 Student Management System</h1>
            <p>Administrator Activity Logs</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button
            className="back-button"
            onClick={showDashboard}
          >
            ⬅️ Back to Dashboard
          </button>

          <h2>📋 Activity Logs</h2>

          <p
            style={{
              marginTop: "8px",
              marginBottom: "20px",
              color: "#666",
            }}
          >
            Monitor administrator activities performed
            in the system.
          </p>

          {activityLogsLoading ? (
            <p className="message">
              Loading activity logs...
            </p>
          ) : activityLogsMessage ? (
            <p className="message">
              {activityLogsMessage}
            </p>
          ) : activityLogs.length === 0 ? (
            <p className="message">
              No activity logs found.
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Action</th>
                    <th>Date / Time</th>
                  </tr>
                </thead>

                <tbody>
                  {activityLogs.map(
                    (log, index) => (
                      <tr
                        key={
                          log.id !== undefined
                            ? log.id
                            : index
                        }
                      >
                        <td>
                          {log.id}
                        </td>

                        <td>
                          {log.username}
                        </td>

                        <td>
                          {log.action}
                        </td>

                        <td>
                          {log.created_at}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          Student Management System © 2026
        </footer>
      </div>
    );
  }

  // =========================
  // ADMIN MANAGEMENT PAGE
  // =========================

  if (showAdminManagement) {
    return (
      <div className="dashboard-page theme-admin">
        <header className="dashboard-header">
          <div>
            <h1>🎓 Student Management System</h1>
            <p>Admin Account Management</p>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button className="back-button" onClick={showDashboard}>
            ⬅️ Back to Dashboard
          </button>

          <h2>👥 Admin Accounts</h2>

          <div className="bulk-toolbar">
            <span>Add multiple admin accounts in one pass</span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowBulkAdminEntry((visible) => !visible)}
            >
              {showBulkAdminEntry ? "Use single form" : "Use spreadsheet entry"}
            </button>
          </div>

          {showBulkAdminEntry ? (
            <>
              <p className="bulk-hint">Complete one row from left to right. Enter moves to the next field.</p>
              <SpreadsheetGrid rows={bulkAdminRows} setRows={setBulkAdminRows} onSubmit={handleBulkCreateAdmins} loading={bulkAdminLoading} buttonLabel="Save all admins" columns={[{ label: "Username", key: "username" }, { label: "Password", key: "password", type: "password" }, { label: "Confirm password", key: "confirm_password", type: "password" }, { label: "Role", key: "role", initialValue: "Staff", options: [{ label: "Staff", value: "Staff" }, { label: "Administrator", value: "Administrator" }] }]} />
              {bulkAdminResults.length > 0 && <ResultTable title="Added admin details" rows={bulkAdminResults} columns={["id", "username", "role", "status"]} />}
            </>
          ) : <form className="student-form" onSubmit={handleCreateAdmin}>
            <div className="input-group">
              <label>Username</label>
              <input
                type="text"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={newAdminConfirmPassword}
                onChange={(e) => setNewAdminConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>

            <div className="input-group">
              <label>Role</label>
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value)}
              >
                <option value="Staff">Staff</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>

            {adminAccountsMessage && (
              <p className="message">{adminAccountsMessage}</p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={createAdminLoading}
            >
              {createAdminLoading ? "Creating..." : "➕ Create Admin"}
            </button>
          </form>}

          <h2>Current Accounts</h2>

          {adminAccountsLoading ? (
            <p className="message">Loading admin accounts...</p>
          ) : adminAccounts.length === 0 ? (
            <p className="message">No admin accounts found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminAccounts.map((admin) => (
                    <tr key={admin.id}>
                      <td>{admin.id}</td>
                      <td>{admin.username}</td>
                      <td>{admin.role}</td>
                      <td>{admin.status}</td>
                      <td>{admin.created_at}</td>
                      <td>
                        <select
                          className="admin-role-select"
                          value={admin.role}
                          disabled={
                            admin.username === username ||
                            adminActionLoadingId === admin.id
                          }
                          onChange={(e) =>
                            handleUpdateAdminRole(
                              admin.id,
                              e.target.value
                            )
                          }
                        >
                          <option value="Staff">Staff</option>
                          <option value="Administrator">
                            Administrator
                          </option>
                        </select>

                        <button
                          type="button"
                          className="admin-action-button"
                          disabled={
                            admin.username === username ||
                            adminActionLoadingId === admin.id
                          }
                          onClick={() =>
                            handleToggleAdminStatus(admin.id)
                          }
                        >
                          {adminActionLoadingId === admin.id
                            ? "Saving..."
                            : admin.status === "Active"
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          Student Management System © 2026
        </footer>
      </div>
    );
  }

  // =========================
  // FACULTY MANAGEMENT PAGE
  // =========================

  if (showFacultyManagement) {
    return (
      <div className="dashboard-page theme-faculty">
        <header className="dashboard-header">
          <div>
            <h1>🎓 Student Management System</h1>
            <p>Faculty Management</p>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button className="back-button" onClick={showDashboard}>
            ⬅️ Back to Dashboard
          </button>

          <h2>👨‍🏫 Add Faculty Member</h2>

          <form className="student-form" onSubmit={handleCreateFaculty}>
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                placeholder="Enter faculty name"
              />
            </div>

            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                value={facultyEmail}
                onChange={(e) => setFacultyEmail(e.target.value)}
                placeholder="Enter faculty email"
              />
            </div>

            <div className="input-group">
              <label>Phone</label>
              <input
                type="tel"
                value={facultyPhone}
                onChange={(e) => setFacultyPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="input-group">
              <label>Department</label>
              <select
                value={facultyDepartmentId}
                onChange={(e) => setFacultyDepartmentId(e.target.value)}
              >
                <option value="">Select Department</option>
                <option value="1">BCA</option>
                <option value="2">BBA</option>
                <option value="3">B.Tech</option>
                <option value="4">MCA</option>
              </select>
            </div>

            <div className="input-group">
              <label>Designation</label>
              <input
                type="text"
                value={facultyDesignation}
                onChange={(e) => setFacultyDesignation(e.target.value)}
                placeholder="e.g. Assistant Professor"
              />
            </div>

            <div className="input-group">
              <label>Faculty Username</label>
              <input
                type="text"
                value={facultyUsername}
                onChange={(e) => setFacultyUsername(e.target.value)}
                placeholder="Enter login username"
              />
            </div>

            <div className="input-group">
              <label>Faculty Password</label>
              <input
                type="password"
                value={facultyPassword}
                onChange={(e) => setFacultyPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={facultyConfirmPassword}
                onChange={(e) => setFacultyConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>

            {facultyMessage && (
              <p className="message">{facultyMessage}</p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={createFacultyLoading}
            >
              {createFacultyLoading ? "Creating..." : "➕ Create Faculty"}
            </button>
          </form>

          <div className="bulk-toolbar">
            <span>Add multiple faculty members</span>
            <span className="bulk-hint">Complete each row and press Enter to move forward.</span>
          </div>
          <SpreadsheetGrid rows={bulkFacultyRows} setRows={setBulkFacultyRows} onSubmit={handleBulkCreateFaculty} loading={bulkFacultyLoading} buttonLabel="Save all faculty" columns={[{ label: "Name", key: "name" }, { label: "Email", key: "email", type: "email" }, { label: "Phone", key: "phone" }, { label: "Department ID", key: "department_id" }, { label: "Designation", key: "designation" }, { label: "Username", key: "username" }, { label: "Password", key: "password", type: "password" }, { label: "Confirm password", key: "confirm_password", type: "password" }]} />
          {bulkFacultyResults.length > 0 && <ResultTable title="Added faculty details" rows={bulkFacultyResults} columns={["id", "name", "email", "phone", "department_id", "designation", "username", "status"]} />}

          <BulkPastePanel title="faculty" endpoint="${API_URL}/admin/faculty" username={username} onComplete={handleOpenFacultyManagement} columns={[{ label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Phone", key: "phone" }, { label: "Department ID", key: "department_id", numeric: true }, { label: "Designation", key: "designation" }, { label: "Username", key: "username" }, { label: "Password", key: "password" }, { label: "Confirm Password", key: "confirm_password" }]} />

          <h2>Faculty Members</h2>

          {facultyLoading ? (
            <p className="message">Loading faculty members...</p>
          ) : facultyMembers.length === 0 ? (
            <p className="message">No faculty members found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Username</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.id}</td>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.department}</td>
                      <td>{member.designation}</td>
                      <td>{member.username}</td>
                      <td>{member.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          Student Management System © 2026
        </footer>
      </div>
    );
  }

  // =========================
  // COURSE MANAGEMENT PAGE
  // =========================

  if (showCourseManagement) {
    return (
      <div className="dashboard-page theme-course">
        <header className="dashboard-header">
          <div>
            <h1>🎓 College ERP System</h1>
            <p>Course Management</p>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button className="back-button" onClick={showDashboard}>
            ⬅️ Back to Dashboard
          </button>

          <h2>📚 Add Course</h2>

          <form className="student-form" onSubmit={handleCreateCourse}>
            <div className="input-group">
              <label>Department</label>
              <select
                value={courseDepartmentId}
                onChange={(e) => setCourseDepartmentId(e.target.value)}
              >
                <option value="">Select Department</option>
                <option value="1">BCA</option>
                <option value="2">BBA</option>
                <option value="3">B.Tech</option>
                <option value="4">MCA</option>
              </select>
            </div>

            <div className="input-group">
              <label>Course Name</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Bachelor of Computer Applications"
              />
            </div>

            <div className="input-group">
              <label>Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. BCA"
              />
            </div>

            <div className="input-group">
              <label>Duration in Years</label>
              <input
                type="number"
                min="1"
                value={courseDuration}
                onChange={(e) => setCourseDuration(e.target.value)}
              />
            </div>

            {courseMessage && <p className="message">{courseMessage}</p>}

            <button
              type="submit"
              className="login-button"
              disabled={createCourseLoading}
            >
              {createCourseLoading ? "Creating..." : "➕ Create Course"}
            </button>
          </form>

          <BulkPastePanel title="courses" endpoint="${API_URL}/admin/courses" username={username} onComplete={handleOpenCourseManagement} columns={[{ label: "Department ID", key: "department_id", numeric: true }, { label: "Name", key: "name" }, { label: "Code", key: "code" }, { label: "Duration", key: "duration_years", numeric: true }]} />

          <h2>Courses</h2>
          {coursesLoading ? (
            <p className="message">Loading courses...</p>
          ) : courses.length === 0 ? (
            <p className="message">No courses found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.id}</td>
                      <td>{course.name}</td>
                      <td>{course.code}</td>
                      <td>{course.department}</td>
                      <td>{course.duration_years} years</td>
                      <td>{course.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          College ERP System © 2026
        </footer>
      </div>
    );
  }

  // =========================
  // SEMESTER MANAGEMENT PAGE
  // =========================

  if (showSemesterManagement) {
    return (
      <div className="dashboard-page theme-semester">
        <header className="dashboard-header">
          <div>
            <h1>🎓 College ERP System</h1>
            <p>Semester Management</p>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button className="back-button" onClick={showDashboard}>
            ⬅️ Back to Dashboard
          </button>

          <h2>📅 Add Semester</h2>

          <form className="student-form" onSubmit={handleCreateSemester}>
            <div className="input-group">
              <label>Course</label>
              <select
                value={semesterCourseId}
                onChange={(e) => setSemesterCourseId(e.target.value)}
              >
                <option value="">Select Course</option>
                {semesterCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Semester Number</label>
              <input
                type="number"
                min="1"
                max="12"
                value={semesterNumber}
                onChange={(e) => setSemesterNumber(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Semester Name</label>
              <input
                type="text"
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                placeholder="e.g. First Semester"
              />
            </div>

            {semesterMessage && <p className="message">{semesterMessage}</p>}

            <button
              type="submit"
              className="login-button"
              disabled={createSemesterLoading}
            >
              {createSemesterLoading ? "Creating..." : "➕ Create Semester"}
            </button>
          </form>

          <BulkPastePanel title="semesters" endpoint="${API_URL}/admin/semesters" username={username} onComplete={handleOpenSemesterManagement} columns={[{ label: "Course ID", key: "course_id", numeric: true }, { label: "Number", key: "semester_number", numeric: true }, { label: "Name", key: "name" }]} />

          <h2>Semesters</h2>
          {semestersLoading ? (
            <p className="message">Loading semesters...</p>
          ) : semesters.length === 0 ? (
            <p className="message">No semesters found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Course</th>
                    <th>Number</th>
                    <th>Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map((semester) => (
                    <tr key={semester.id}>
                      <td>{semester.id}</td>
                      <td>{semester.course_code} - {semester.course}</td>
                      <td>{semester.semester_number}</td>
                      <td>{semester.name}</td>
                      <td>{semester.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          College ERP System © 2026
        </footer>
      </div>
    );
  }

  // =========================
  // SUBJECT MANAGEMENT PAGE
  // =========================

  if (showSubjectManagement) {
    return (
      <div className="dashboard-page theme-subject">
        <header className="dashboard-header">
          <div>
            <h1>🎓 College ERP System</h1>
            <p>Subject Management</p>
          </div>
          <button className="logout-button" onClick={handleLogout}>🚪 Logout</button>
        </header>

        <section className="students-section">
          <button className="back-button" onClick={showDashboard}>⬅️ Back to Dashboard</button>
          <h2>📖 Add Subject</h2>

          <form className="student-form" onSubmit={handleCreateSubject}>
            <div className="input-group">
              <label>Semester</label>
              <select value={subjectSemesterId} onChange={(e) => setSubjectSemesterId(e.target.value)}>
                <option value="">Select Semester</option>
                {subjectSemesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.course_code} - {semester.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Subject Name</label>
              <input type="text" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Python Programming" />
            </div>

            <div className="input-group">
              <label>Subject Code</label>
              <input type="text" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="e.g. PY101" />
            </div>

            <div className="input-group">
              <label>Credits</label>
              <input type="number" min="1" value={subjectCredits} onChange={(e) => setSubjectCredits(e.target.value)} />
            </div>

            {subjectMessage && <p className="message">{subjectMessage}</p>}
            <button type="submit" className="login-button" disabled={createSubjectLoading}>
              {createSubjectLoading ? "Creating..." : "➕ Create Subject"}
            </button>
          </form>

          <BulkPastePanel title="subjects" endpoint="${API_URL}/admin/subjects" username={username} onComplete={handleOpenSubjectManagement} columns={[{ label: "Semester ID", key: "semester_id", numeric: true }, { label: "Name", key: "name" }, { label: "Code", key: "code" }, { label: "Credits", key: "credits", numeric: true }]} />

          <h2>Subjects</h2>
          {subjectsLoading ? (
            <p className="message">Loading subjects...</p>
          ) : subjects.length === 0 ? (
            <p className="message">No subjects found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>ID</th><th>Subject</th><th>Code</th><th>Course</th><th>Semester</th><th>Credits</th><th>Status</th></tr></thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td>{subject.id}</td><td>{subject.name}</td><td>{subject.code}</td><td>{subject.course_code}</td><td>{subject.semester}</td><td>{subject.credits}</td><td>{subject.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">College ERP System © 2026</footer>
      </div>
    );
  }

  // =========================
  // SECTION MANAGEMENT PAGE
  // =========================

  if (showSectionManagement) {
    return (
      <div className="dashboard-page theme-section">
        <header className="dashboard-header">
          <div><h1>🎓 College ERP System</h1><p>Section Management</p></div>
          <button className="logout-button" onClick={handleLogout}>🚪 Logout</button>
        </header>

        <section className="students-section">
          <button className="back-button" onClick={showDashboard}>⬅️ Back to Dashboard</button>
          <h2>🏫 Add Section</h2>

          <form className="student-form" onSubmit={handleCreateSection}>
            <div className="input-group">
              <label>Semester</label>
              <select value={sectionSemesterId} onChange={(e) => setSectionSemesterId(e.target.value)}>
                <option value="">Select Semester</option>
                {sectionSemesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.course_code} - {semester.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Section Name</label>
              <input type="text" value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="e.g. A" />
            </div>

            <div className="input-group">
              <label>Capacity</label>
              <input type="number" min="1" value={sectionCapacity} onChange={(e) => setSectionCapacity(e.target.value)} />
            </div>

            {sectionMessage && <p className="message">{sectionMessage}</p>}
            <button type="submit" className="login-button" disabled={createSectionLoading}>
              {createSectionLoading ? "Creating..." : "➕ Create Section"}
            </button>
          </form>

          <BulkPastePanel title="sections" endpoint="${API_URL}/admin/sections" username={username} onComplete={handleOpenSectionManagement} columns={[{ label: "Semester ID", key: "semester_id", numeric: true }, { label: "Name", key: "name" }, { label: "Capacity", key: "capacity", numeric: true }]} />

          <h2>Sections</h2>
          {sectionsLoading ? (
            <p className="message">Loading sections...</p>
          ) : sections.length === 0 ? (
            <p className="message">No sections found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>ID</th><th>Course</th><th>Semester</th><th>Section</th><th>Capacity</th><th>Status</th></tr></thead>
                <tbody>
                  {sections.map((section) => (
                    <tr key={section.id}>
                      <td>{section.id}</td><td>{section.course_code}</td><td>{section.semester}</td><td>{section.name}</td><td>{section.capacity}</td><td>{section.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">College ERP System © 2026</footer>
      </div>
    );
  }

  // =========================
  // CATEGORY STUDENT LIST
  // =========================

  if (
    showDashboardStats &&
    selectedCategory
  ) {
    const filteredStudents =
      getFilteredStudents();

    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>
              🎓 Student Management System
            </h1>

            <p>
              Student Statistics Dashboard
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button
            className="back-button"
            onClick={handleBackToStatistics}
          >
            ⬅️ Back to Statistics
          </button>

          <h2>
            {selectedCategory}
          </h2>

          <p
            style={{
              marginTop: "8px",
              color: "#666",
            }}
          >
            Showing{" "}
            {filteredStudents.length}{" "}
            student
            {filteredStudents.length !== 1
              ? "s"
              : ""}
            .
          </p>

          {filteredStudents.length === 0 ? (
            <p
              className="message"
              style={{
                marginTop: "25px",
              }}
            >
              No students found in this
              category.
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Gender</th>
                    <th>Date of Birth</th>
                    <th>Created At</th>
                    <th>Department</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (student, index) => (
                      <tr key={index}>
                        <td>
                          {student[0]}
                        </td>

                        <td>
                          {student[1]}
                        </td>

                        <td>
                          {student[2]}
                        </td>

                        <td>
                          {student[3]}
                        </td>

                        <td>
                          {student[4]}
                        </td>

                        <td>
                          {student[5]}
                        </td>

                        <td>
                          {student[6]}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          Student Management System © 2026
        </footer>
      </div>
    );
  }

  // =========================
  // DASHBOARD STATISTICS PAGE
  // =========================

  if (showDashboardStats) {
    const totalStudents =
      students.length;

    const maleStudents =
      students.filter(
        (student) =>
          student[3] === "Male"
      ).length;

    const femaleStudents =
      students.filter(
        (student) =>
          student[3] === "Female"
      ).length;

    const otherStudents =
      students.filter(
        (student) =>
          student[3] === "Other"
      ).length;

    const bcaStudents =
      students.filter(
        (student) =>
          student[6] === "BCA"
      ).length;

    const bbaStudents =
      students.filter(
        (student) =>
          student[6] === "BBA"
      ).length;

    const btechStudents =
      students.filter(
        (student) =>
          student[6] === "B.Tech"
      ).length;

    const mcaStudents =
      students.filter(
        (student) =>
          student[6] === "MCA"
      ).length;

    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>
              🎓 Student Management System
            </h1>

            <p>
              Student Statistics Dashboard
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <h2>
            📊 Student Statistics
          </h2>

          <p
            style={{
              marginTop: "8px",
              marginBottom: "20px",
              color: "#666",
            }}
          >
            Overview of students in the
            system.
          </p>

          <button
            className="back-button"
            onClick={showDashboard}
          >
            ⬅️ Back to Dashboard
          </button>

          {statsLoading ? (
            <p className="message">
              Loading statistics...
            </p>
          ) : statsMessage ? (
            <p className="message">
              {statsMessage}
            </p>
          ) : (
            <div className="dashboard-grid">
              <button
                className="dashboard-card"
                onClick={() =>
                  handleOpenCategory(
                    "Total Students"
                  )
                }
              >
                <span className="card-icon">
                  👨‍🎓
                </span>

                <h3>
                  Total Students
                </h3>

                <p>
                  {totalStudents}
                </p>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  handleOpenCategory(
                    "Male Students"
                  )
                }
              >
                <span className="card-icon">
                  👨
                </span>

                <h3>
                  Male Students
                </h3>

                <p>
                  {maleStudents}
                </p>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  handleOpenCategory(
                    "Female Students"
                  )
                }
              >
                <span className="card-icon">
                  👩
                </span>

                <h3>
                  Female Students
                </h3>

                <p>
                  {femaleStudents}
                </p>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  handleOpenCategory(
                    "Other Gender"
                  )
                }
              >
                <span className="card-icon">
                  🧑
                </span>

                <h3>
                  Other Gender
                </h3>

                <p>
                  {otherStudents}
                </p>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  handleOpenCategory(
                    "BCA Students"
                  )
                }
              >
                <span className="card-icon">
                  🎓
                </span>

                <h3>
                  BCA Students
                </h3>

                <p>
                  {bcaStudents}
                </p>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  handleOpenCategory(
                    "BBA Students"
                  )
                }
              >
                <span className="card-icon">
                  📚
                </span>

                <h3>
                  BBA Students
                </h3>

                <p>
                  {bbaStudents}
                </p>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  handleOpenCategory(
                    "B.Tech Students"
                  )
                }
              >
                <span className="card-icon">
                  💻
                </span>

                <h3>
                  B.Tech Students
                </h3>

                <p>
                  {btechStudents}
                </p>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  handleOpenCategory(
                    "MCA Students"
                  )
                }
              >
                <span className="card-icon">
                  🏫
                </span>

                <h3>
                  MCA Students
                </h3>

                <p>
                  {mcaStudents}
                </p>
              </button>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          Student Management System © 2026
        </footer>
      </div>
    );
  }

  // =========================
  // CHANGE PASSWORD PAGE
  // =========================

  if (showChangePassword) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>
              🎓 Student Management System
            </h1>

            <p>
              Change Admin Password
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button
            className="back-button"
            onClick={showDashboard}
          >
            ⬅️ Back to Dashboard
          </button>

          <h2>
            🔐 Change Password
          </h2>

          <p
            style={{
              marginTop: "8px",
              marginBottom: "20px",
              color: "#666",
            }}
          >
            Update your administrator
            account password.
          </p>

          <form
            className="student-form"
            onSubmit={handleChangePassword}
          >
            <div className="input-group">
              <label>
                Current Password
              </label>

              <div className="password-box">
                <input
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter current password"
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowCurrentPassword(
                      !showCurrentPassword
                    )
                  }
                >
                  {showCurrentPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>
                New Password
              </label>

              <div className="password-box">
                <input
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter new password"
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowNewPassword(
                      !showNewPassword
                    )
                  }
                >
                  {showNewPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>

              <small
                style={{
                  marginTop: "6px",
                  color: "#666",
                }}
              >
                Minimum 8 characters,
                including uppercase,
                lowercase and number.
              </small>
            </div>

            <div className="input-group">
              <label>
                Confirm New Password
              </label>

              <div className="password-box">
                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Confirm new password"
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  {showConfirmPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            {changePasswordMessage && (
              <p
                className={`message ${
                  changePasswordSuccess
                    ? "success-message"
                    : ""
                }`}
              >
                {changePasswordMessage}
              </p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={
                changePasswordLoading
              }
            >
              {changePasswordLoading
                ? "Changing Password..."
                : "🔐 Change Password"}
            </button>
          </form>
        </section>

        <footer className="dashboard-footer">
          Student Management System © 2026
        </footer>
      </div>
    );
  }

  // =========================
  // ADMIN PROFILE PAGE
  // =========================

  if (showAdminProfile) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>
              🎓 Student Management System
            </h1>

            <p>
              Administrator Profile
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="admin-profile-section">
          <button
            className="back-button"
            onClick={showDashboard}
          >
            ⬅️ Back to Dashboard
          </button>

          <div className="admin-profile-hero">
            <div className="admin-avatar">
              👤
            </div>

            <div className="admin-profile-main">
              <p className="profile-welcome">
                Welcome back 👋
              </p>

              <h2>{username}</h2>

              <p className="admin-profile-subtitle">
                Manage your administrator
                account and security
                settings.
              </p>

              <div className="profile-badges">
                <span className="profile-badge active-badge">
                  🟢 {adminStatus || "Active"}
                </span>

                <span className="profile-badge admin-badge">
                  🛡️ {adminRole || "Administrator"}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-section-title">
            <h2>
              📊 Account Overview
            </h2>

            <p>
              Information about your
              administrator account
            </p>
          </div>

          <div className="profile-info-grid">
            <div className="profile-info-card">
              <div className="profile-info-icon">
                👤
              </div>

              <div>
                <span>Admin ID</span>
                <h3>{adminId ?? "-"}</h3>
              </div>
            </div>

            <div className="profile-info-card">
              <div className="profile-info-icon">
                👤
              </div>

              <div>
                <span>Username</span>
                <h3>{username}</h3>
              </div>
            </div>

            <div className="profile-info-card">
              <div className="profile-info-icon">
                🛡️
              </div>

              <div>
                <span>Account Type</span>
                <h3>
                  {adminRole || "Administrator"}
                </h3>
              </div>
            </div>

            <div className="profile-info-card">
              <div className="profile-info-icon">
                🟢
              </div>

              <div>
                <span>
                  Account Status
                </span>

                <h3>{adminStatus || "Active"}</h3>
              </div>
            </div>

            <div className="profile-info-card">
              <div className="profile-info-icon">
                🔐
              </div>

              <div>
                <span>Security</span>
                <h3>Protected</h3>
              </div>
            </div>
          </div>

          <div className="profile-section-title">
            <h2>
              🔐 Security Settings
            </h2>

            <p>
              Keep your administrator
              account secure
            </p>
          </div>

          <div className="security-card">
            <div className="security-left">
              <div className="security-icon">
                🔑
              </div>

              <div>
                <h3>
                  Admin Password
                </h3>

                <p>
                  Your password is
                  securely protected.
                </p>

                <div className="password-protected">
                  🔒 ••••••••••
                </div>
              </div>
            </div>

            <button
              className="profile-action-button"
              onClick={
                handleOpenChangePassword
              }
            >
              🔐 Change Password
            </button>
          </div>

          <div className="profile-section-title">
            <h2>
              ⚙️ Account Status
            </h2>

            <p>
              Current administrator
              account information
            </p>
          </div>

          <div className="profile-status-card">
            <div className="status-item">
              <span className="status-icon">
                🟢
              </span>

              <div>
                <strong>
                  Account Active
                </strong>

                <p>
                  Your administrator
                  account is currently
                  active.
                </p>
              </div>
            </div>

            <div className="status-item">
              <span className="status-icon">
                🔒
              </span>

              <div>
                <strong>
                  Secure Account
                </strong>

                <p>
                  Your login credentials
                  are protected.
                </p>
              </div>
            </div>

            <div className="status-item">
              <span className="status-icon">
                📋
              </span>

              <div>
                <strong>
                  Activity Monitoring
                </strong>

                <p>
                  Administrator
                  activities can be
                  monitored through
                  Activity Logs.
                </p>
              </div>
            </div>
          </div>

          <div className="profile-section-title">
            <h2>
              ⚡ Quick Actions
            </h2>

            <p>
              Quickly access important
              account features
            </p>
          </div>

          <div className="profile-quick-actions">
            <button
              className="profile-quick-button"
              onClick={
                handleOpenChangePassword
              }
            >
              <span>🔐</span>

              <div>
                <strong>
                  Change Password
                </strong>

                <small>
                  Update your admin
                  password
                </small>
              </div>
            </button>

            <button
              className="profile-quick-button"
              onClick={showDashboard}
            >
              <span>🏠</span>

              <div>
                <strong>
                  Dashboard
                </strong>

                <small>
                  Return to admin
                  dashboard
                </small>
              </div>
            </button>

            <button
              className="profile-quick-button logout-profile-button"
              onClick={handleLogout}
            >
              <span>🚪</span>

              <div>
                <strong>Logout</strong>

                <small>
                  Securely logout from
                  your account
                </small>
              </div>
            </button>
          </div>
        </section>

        <footer className="dashboard-footer">
          Student Management System ©
          2026
        </footer>
      </div>
    );
  }

  // =========================
  // VIEW STUDENTS PAGE
  // =========================

  if (showStudents) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>
              🎓 Student Management System
            </h1>

            <p>View Students</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button
            className="back-button"
            onClick={showDashboard}
          >
            ⬅️ Back to Dashboard
          </button>

          <h2>
            👨‍🎓 All Students
          </h2>

          {deleteMessage && (
            <p className={`message ${deleteSuccess ? "success-message" : ""}`}>
              {deleteMessage}
            </p>
          )}

          {selectedStudentIds.length > 0 && (
            <div className="bulk-toolbar">
              <span>{selectedStudentIds.length} selected</span>
              <button type="button" className="danger-button" onClick={handleDeleteSelectedStudents}>
                🗑️ Delete Selected
              </button>
            </div>
          )}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all students"
                      checked={students.length > 0 && selectedStudentIds.length === students.length}
                      onChange={(event) =>
                        setSelectedStudentIds(
                          event.target.checked ? students.map((student) => student[0]) : []
                        )
                      }
                    />
                  </th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Gender</th>
                  <th>Date of Birth</th>
                  <th>Created At</th>
                  <th>Department</th>
                </tr>
              </thead>

              <tbody>
                {students.map(
                  (student, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select student ${student[1]}`}
                          checked={selectedStudentIds.includes(student[0])}
                          onChange={() => toggleStudentSelection(student[0])}
                        />
                      </td>
                      <td>{student[0]}</td>
                      <td>{student[1]}</td>
                      <td>{student[2]}</td>
                      <td>{student[3]}</td>
                      <td>{student[4]}</td>
                      <td>{student[5]}</td>
                      <td>{student[6]}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="dashboard-footer">
          Student Management System ©
          2026
        </footer>
      </div>
    );
  }

  // =========================
  // ADD STUDENT PAGE
  // =========================

  if (showAddStudent) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>
              🎓 Student Management System
            </h1>

            <p>Add Student</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button
            className="back-button"
            onClick={showDashboard}
          >
            ⬅️ Back to Dashboard
          </button>

          <h2>
            ➕ Add Student
          </h2>

          <div className="bulk-toolbar">
            <span>Add several students in one pass</span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowBulkStudentEntry((visible) => !visible)}
            >
              {showBulkStudentEntry ? "Use single form" : "Use spreadsheet entry"}
            </button>
          </div>

          {showBulkStudentEntry ? (
            <form className="bulk-form" onSubmit={handleBulkAddStudents}>
              <p className="bulk-hint">Fill each row, then save all students together.</p>
              <div className="bulk-table-container">
                <table className="bulk-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Gender</th><th>Date of birth</th><th>Department</th><th></th></tr></thead>
                  <tbody>
                    {bulkStudentRows.map((row, index) => (
                      <tr key={index}>
                        <td><input data-bulk-student-row={index} data-bulk-student-field="name" onKeyDown={(event) => handleBulkStudentKeyDown(event, index, "name")} value={row.name} onChange={(event) => updateBulkStudentRow(index, "name", event.target.value)} placeholder="Name" /></td>
                        <td><input data-bulk-student-row={index} data-bulk-student-field="email" onKeyDown={(event) => handleBulkStudentKeyDown(event, index, "email")} type="email" value={row.email} onChange={(event) => updateBulkStudentRow(index, "email", event.target.value)} placeholder="Email" /></td>
                        <td><select data-bulk-student-row={index} data-bulk-student-field="gender" onKeyDown={(event) => handleBulkStudentKeyDown(event, index, "gender")} value={row.gender} onChange={(event) => updateBulkStudentRow(index, "gender", event.target.value)}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></td>
                        <td><input data-bulk-student-row={index} data-bulk-student-field="dob" onKeyDown={(event) => handleBulkStudentKeyDown(event, index, "dob")} type="date" value={row.dob} onChange={(event) => updateBulkStudentRow(index, "dob", event.target.value)} /></td>
                        <td><select data-bulk-student-row={index} data-bulk-student-field="department_id" onKeyDown={(event) => handleBulkStudentKeyDown(event, index, "department_id")} value={row.department_id} onChange={(event) => updateBulkStudentRow(index, "department_id", event.target.value)}><option value="">Select</option><option value="1">BCA</option><option value="2">BBA</option><option value="3">B.Tech</option><option value="4">MCA</option></select></td>
                        <td><button type="button" className="icon-button" aria-label="Remove row" onClick={() => removeBulkStudentRow(index)}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bulkStudentMessage && <p className="message">{bulkStudentMessage}</p>}
              <div className="bulk-actions">
                <button type="button" className="secondary-button" onClick={addBulkStudentRow}>＋ Add row</button>
                <button type="submit" className="login-button" disabled={bulkStudentLoading}>{bulkStudentLoading ? "Saving..." : "Save all students"}</button>
              </div>
            </form>
          ) : <form
            className="student-form"
            onSubmit={handleAddStudent}
          >
            <div className="input-group">
              <label>Name</label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Enter student name"
              />
            </div>

            <div className="input-group">
              <label>Email</label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter email"
              />
            </div>

            <div className="input-group">
              <label>Gender</label>

              <select
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value)
                }
              >
                <option value="">
                  Select Gender
                </option>

                <option value="Male">
                  Male
                </option>

                <option value="Female">
                  Female
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            <div className="input-group">
              <label>
                Date of Birth
              </label>

              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) =>
                  setDateOfBirth(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="input-group">
              <label>
                Department
              </label>

              <select
                value={departmentId}
                onChange={(e) =>
                  setDepartmentId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Department
                </option>

                <option value="1">
                  BCA
                </option>

                <option value="2">
                  BBA
                </option>

                <option value="3">
                  B.Tech
                </option>

                <option value="4">
                  MCA
                </option>
              </select>
            </div>

            {addMessage && (
              <p
                className={`message ${
                  addSuccess
                    ? "success-message"
                    : ""
                }`}
              >
                {addMessage}
              </p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={addLoading}
            >
              {addLoading
                ? "Adding..."
                : "➕ Add Student"}
            </button>
          </form>}

          {lastAddedStudent && !showBulkStudentEntry && (
            <div className="saved-record">
              <h3>Student saved successfully</h3>
              <div className="saved-record-grid">
                <span><strong>Student ID</strong>{lastAddedStudent.student_id}</span>
                <span><strong>Name</strong>{lastAddedStudent.name}</span>
                <span><strong>Email</strong>{lastAddedStudent.email}</span>
                <span><strong>Gender</strong>{lastAddedStudent.gender}</span>
                <span><strong>Date of Birth</strong>{lastAddedStudent.date_of_birth}</span>
                <span><strong>Department</strong>{lastAddedStudent.department}</span>
              </div>
            </div>
          )}

          {bulkAddedStudents.length > 0 && showBulkStudentEntry && (
            <div className="saved-record bulk-saved-record">
              <h3>Added student details</h3>
              <div className="bulk-table-container">
                <table className="bulk-table">
                  <thead><tr><th>Student ID</th><th>Name</th><th>Email</th><th>Gender</th><th>Date of Birth</th><th>Department</th></tr></thead>
                  <tbody>
                    {bulkAddedStudents.map((student) => (
                      <tr key={student.student_id}>
                        <td>{student.student_id}</td><td>{student.name}</td><td>{student.email}</td><td>{student.gender}</td><td>{student.date_of_birth}</td><td>{student.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          Student Management System ©
          2026
        </footer>
      </div>
    );
  }

  // =========================
  // SEARCH STUDENT PAGE
  // =========================

  if (showSearchStudent) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>
              🎓 Student Management System
            </h1>

            <p>Search Student</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button
            className="back-button"
            onClick={showDashboard}
          >
            ⬅️ Back to Dashboard
          </button>

          <h2>
            🔍 Search Student
          </h2>

          <form
            className="student-form"
            onSubmit={handleSearchStudent}
          >
            <div className="input-group">
              <label>Search By</label>

              <select
                value={searchType}
                onChange={(e) =>
                  setSearchType(
                    e.target.value
                  )
                }
              >
                <option value="id">
                  Student ID
                </option>

                <option value="name">
                  Student Name
                </option>
              </select>
            </div>

            <div className="input-group">
              <label>
                {searchType === "id"
                  ? "Student ID"
                  : "Student Name"}
              </label>

              <input
                type="text"
                value={searchValue}
                onChange={(e) =>
                  setSearchValue(
                    e.target.value
                  )
                }
                placeholder={
                  searchType === "id"
                    ? "Enter Student ID"
                    : "Enter Student Name"
                }
              />
            </div>

            {searchMessage && (
              <p className="message">
                {searchMessage}
              </p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={searchLoading}
            >
              {searchLoading
                ? "Searching..."
                : "🔍 Search Student"}
            </button>
          </form>

          {searchResult && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Gender</th>
                    <th>Date of Birth</th>
                    <th>Created At</th>
                    <th>Department</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>
                      {searchResult.student_id}
                    </td>

                    <td>
                      {searchResult.name}
                    </td>

                    <td>
                      {searchResult.email}
                    </td>

                    <td>
                      {searchResult.gender}
                    </td>

                    <td>
                      {searchResult.date_of_birth}
                    </td>

                    <td>
                      {searchResult.created_at}
                    </td>

                    <td>
                      {searchResult.department}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          Student Management System ©
          2026
        </footer>
      </div>
    );
  }

  // =========================
  // UPDATE STUDENT PAGE
  // =========================

  if (showUpdateStudent) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>
              🎓 Student Management System
            </h1>

            <p>Update Student</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button
            className="back-button"
            onClick={showDashboard}
          >
            ⬅️ Back to Dashboard
          </button>

          <h2>
            ✏️ Update Student
          </h2>

          <form
            className="student-form"
            onSubmit={handleUpdateStudent}
          >
            <div className="input-group">
              <label>
                Student ID
              </label>

              <input
                type="text"
                value={updateId}
                onChange={(e) =>
                  setUpdateId(
                    e.target.value
                  )
                }
                placeholder="Enter Student ID"
              />
            </div>

            <div className="input-group">
              <label>Name</label>

              <input
                type="text"
                value={updateName}
                onChange={(e) =>
                  setUpdateName(
                    e.target.value
                  )
                }
                placeholder="Enter new name"
              />
            </div>

            <div className="input-group">
              <label>Email</label>

              <input
                type="email"
                value={updateEmail}
                onChange={(e) =>
                  setUpdateEmail(
                    e.target.value
                  )
                }
                placeholder="Enter new email"
              />
            </div>

            <div className="input-group">
              <label>Gender</label>

              <select
                value={updateGender}
                onChange={(e) =>
                  setUpdateGender(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Gender
                </option>

                <option value="Male">
                  Male
                </option>

                <option value="Female">
                  Female
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            <div className="input-group">
              <label>
                Date of Birth
              </label>

              <input
                type="date"
                value={updateDateOfBirth}
                onChange={(e) =>
                  setUpdateDateOfBirth(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="input-group">
              <label>
                Department
              </label>

              <select
                value={updateDepartmentId}
                onChange={(e) =>
                  setUpdateDepartmentId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Department
                </option>

                <option value="1">
                  BCA
                </option>

                <option value="2">
                  BBA
                </option>

                <option value="3">
                  B.Tech
                </option>

                <option value="4">
                  MCA
                </option>
              </select>
            </div>

            {updateMessage && (
              <p
                className={`message ${
                  updateSuccess
                    ? "success-message"
                    : ""
                }`}
              >
                {updateMessage}
              </p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={updateLoading}
            >
              {updateLoading
                ? "Updating..."
                : "✏️ Update Student"}
            </button>
          </form>
        </section>

        <footer className="dashboard-footer">
          Student Management System ©
          2026
        </footer>
      </div>
    );
  }

  // =========================
  // DELETE STUDENT PAGE
  // =========================

  if (showDeleteStudent) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>
              🎓 Student Management System
            </h1>

            <p>Delete Student</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </header>

        <section className="students-section">
          <button
            className="back-button"
            onClick={showDashboard}
          >
            ⬅️ Back to Dashboard
          </button>

          <h2>
            🗑️ Delete Student
          </h2>

          <div className="bulk-toolbar">
            <span>Delete multiple students in one pass</span>
            <button type="button" className="secondary-button" onClick={() => setShowBulkDeleteEntry((visible) => !visible)}>
              {showBulkDeleteEntry ? "Use single delete" : "Use spreadsheet delete"}
            </button>
          </div>

          {showBulkDeleteEntry ? (
            <>
              <div className="input-group">
                <label>Delete By</label>
                <select value={deleteType} onChange={(event) => setDeleteType(event.target.value)}>
                  <option value="id">Student ID</option>
                  <option value="name">Student Name</option>
                </select>
              </div>
              <p className="bulk-hint">Enter moves across each row. After the last value, it creates the next row.</p>
              <SpreadsheetGrid rows={bulkDeleteRows} setRows={setBulkDeleteRows} onSubmit={handleBulkDeleteStudents} loading={bulkDeleteLoading} buttonLabel="Delete all students" columns={[{ label: deleteType === "id" ? "Student ID" : "Student Name", key: "value" }]} />
              {deleteMessage && <p className={`message ${deleteSuccess ? "success-message" : ""}`}>{deleteMessage}</p>}
              {bulkDeleteResults.length > 0 && <ResultTable title="Delete results" rows={bulkDeleteResults.map(({ value, result }) => ({ value, status: result.status === "success" ? "Deleted" : result.message || "Not found" }))} columns={["value", "status"]} />}
            </>
          ) : <form
            className="student-form"
            onSubmit={handleDeleteStudent}
          >
            <div className="input-group">
              <label>
                Delete By
              </label>

              <select
                value={deleteType}
                onChange={(e) => {
                  setDeleteType(
                    e.target.value
                  );

                  setDeleteValue("");
                  setDeleteMessage("");
                }}
              >
                <option value="id">
                  Student ID
                </option>

                <option value="name">
                  Student Name
                </option>
              </select>
            </div>

            <div className="input-group">
              <label>
                {deleteType === "id"
                  ? "Student ID"
                  : "Student Name"}
              </label>

              <input
                type="text"
                value={deleteValue}
                onChange={(e) =>
                  setDeleteValue(
                    e.target.value
                  )
                }
                placeholder={
                  deleteType === "id"
                    ? "Enter Student ID"
                    : "Enter Student Name"
                }
              />
            </div>

            {deleteMessage && (
              <p
                className={`message ${
                  deleteSuccess
                    ? "success-message"
                    : ""
                }`}
              >
                {deleteMessage}
              </p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={deleteLoading}
            >
              {deleteLoading
                ? "Deleting..."
                : "🗑️ Delete Student"}
            </button>
          </form>}
        </section>

        <footer className="dashboard-footer">
          Student Management System ©
          2026
        </footer>
      </div>
    );
  }

  // =========================
  // MAIN DASHBOARD
  // =========================

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>
            🎓 Student Management System
          </h1>

          <p>
            Welcome, {username}
          </p>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          🚪 Logout
        </button>
      </header>

      <div className="welcome-box">
        <h2>
          Welcome to Admin Dashboard 👋
        </h2>

        <p>
          Manage students and view system
          information from here.
        </p>
      </div>

      <div className="dashboard-grid">
        <button
          className="dashboard-card"
          onClick={handleOpenStudents}
        >
          <span className="card-icon">
            👨‍🎓
          </span>

          <h3>
            View Students
          </h3>

          <p>
            View all student records
          </p>
        </button>

        <button
          className="dashboard-card"
          onClick={handleOpenAddStudent}
        >
          <span className="card-icon">
            ➕
          </span>

          <h3>
            Add Student
          </h3>

          <p>
            Add a new student
          </p>
        </button>

        <button
          className="dashboard-card"
          onClick={handleOpenSearchStudent}
        >
          <span className="card-icon">
            🔍
          </span>

          <h3>
            Search Student
          </h3>

          <p>
            Search student by ID or name
          </p>
        </button>

        <button
          className="dashboard-card"
          onClick={handleOpenUpdateStudent}
        >
          <span className="card-icon">
            ✏️
          </span>

          <h3>
            Update Student
          </h3>

          <p>
            Update student information
          </p>
        </button>

        <button
          className="dashboard-card"
          onClick={handleOpenDeleteStudent}
        >
          <span className="card-icon">
            🗑️
          </span>

          <h3>
            Delete Student
          </h3>

          <p>
            Delete student record
          </p>
        </button>

        <button
          className="dashboard-card"
          onClick={handleOpenDashboardStats}
        >
          <span className="card-icon">
            📊
          </span>

          <h3>
            Dashboard
          </h3>

          <p>
            View student statistics
          </p>
        </button>

        <button
          className="dashboard-card"
          onClick={handleOpenChangePassword}
        >
          <span className="card-icon">
            🔑
          </span>

          <h3>
            Change Password
          </h3>

          <p>
            Change admin password
          </p>
        </button>

        <button
          className="dashboard-card"
          onClick={handleOpenAdminProfile}
        >
          <span className="card-icon">
            👤
          </span>

          <h3>
            Admin Profile
          </h3>

          <p>
            View admin profile
          </p>
        </button>

        {adminRole === "Administrator" && (
          <button
            className="dashboard-card"
            onClick={handleOpenAdminManagement}
          >
            <span className="card-icon">
              👥
            </span>

            <h3>
              Manage Admins
            </h3>

            <p>
              Create and view admin accounts
            </p>
          </button>
        )}

        {adminRole === "Administrator" && (
          <button
            className="dashboard-card"
            onClick={handleOpenActivityLogs}
          >
            <span className="card-icon">
              📋
            </span>

            <h3>
              Activity Logs
            </h3>

            <p>
              View admin activity
            </p>
          </button>
        )}

        {adminRole === "Administrator" && (
          <button
            className="dashboard-card"
            onClick={handleOpenFacultyManagement}
          >
            <span className="card-icon">
              👨‍🏫
            </span>

            <h3>
              Manage Faculty
            </h3>

            <p>
              Create and view faculty members
            </p>
          </button>
        )}

        {adminRole === "Administrator" && (
          <button
            className="dashboard-card"
            onClick={handleOpenCourseManagement}
          >
            <span className="card-icon">
              📚
            </span>

            <h3>
              Manage Courses
            </h3>

            <p>
              Create and view courses
            </p>
          </button>
        )}

        {adminRole === "Administrator" && (
          <button
            className="dashboard-card"
            onClick={handleOpenSemesterManagement}
          >
            <span className="card-icon">
              📅
            </span>

            <h3>
              Manage Semesters
            </h3>

            <p>
              Create and view semesters
            </p>
          </button>
        )}

        {adminRole === "Administrator" && (
          <button
            className="dashboard-card"
            onClick={handleOpenSubjectManagement}
          >
            <span className="card-icon">📖</span>
            <h3>Manage Subjects</h3>
            <p>Create and view subjects</p>
          </button>
        )}

        {adminRole === "Administrator" && (
          <button
            className="dashboard-card"
            onClick={handleOpenSectionManagement}
          >
            <span className="card-icon">🏫</span>
            <h3>Manage Sections</h3>
            <p>Create and view sections</p>
          </button>
        )}
      </div>

      <footer className="dashboard-footer">
        Student Management System ©
        2026
      </footer>
    </div>
  );
}

export default App;