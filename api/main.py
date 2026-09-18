import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.admin_service import (
    authenticate_admin,
    get_admins_api,
    create_admin_api,
    update_admin_status_api,
    update_admin_role_api,
    has_admin_role
)

from services.admin_log_service import view_admin_logs

from services.faculty_service import (
    get_faculty_api,
    create_faculty_api,
    authenticate_faculty,
    get_faculty_students_api
)

from services.course_service import (
    get_courses_api,
    create_course_api
)

from services.semester_service import (
    get_semesters_api,
    create_semester_api
)

from services.subject_service import (
    get_subjects_api,
    create_subject_api
)

from services.section_service import (
    get_sections_api,
    create_section_api
)

from services.student_portal_service import (
    create_student_account_api,
    authenticate_student,
    assign_student_semester_api,
    get_student_subjects_api
)

from services.attendance_service import (
    record_attendance_api,
    get_student_attendance_api,
    get_faculty_attendance_options_api,
    record_faculty_attendance_api
)

from services.marks_service import (
    record_marks_api,
    get_student_marks_api,
    get_student_result_api,
    get_faculty_marks_options_api,
    record_faculty_marks_api
)

from services.timetable_service import (
    create_timetable_api,
    get_student_timetable_api,
    get_faculty_timetable_api
)

from services.notice_service import (
    create_notice_api,
    get_student_notices_api,
    get_faculty_notices_api
)

from services.student_service import (
    view_students,
    create_student,
    get_student_by_id,
    get_students_by_name,
    update_student_api,
    delete_student_by_id,
    delete_student_by_name,
)


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="Student Management System API",
    description="API for Student Management System",
    version="1.0.0"
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# LOGIN MODEL
# ==========================================

class LoginRequest(BaseModel):

    username: str
    password: str


# ==========================================
# ADD STUDENT MODEL
# ==========================================

class StudentCreate(BaseModel):

    username: str
    name: str
    email: str
    gender: str
    dob: str
    department_id: int


# ==========================================
# UPDATE STUDENT MODEL
# ==========================================

class StudentUpdate(BaseModel):

    username: str
    name: str
    email: str
    gender: str
    dob: str
    department_id: int


class AdminCreate(BaseModel):

    username: str
    password: str
    confirm_password: str
    role: str


class AdminRoleUpdate(BaseModel):

    role: str


class FacultyCreate(BaseModel):

    name: str
    email: str
    phone: str
    department_id: int
    designation: str
    username: str
    password: str
    confirm_password: str


class CourseCreate(BaseModel):

    department_id: int
    name: str
    code: str
    duration_years: int


class SemesterCreate(BaseModel):

    course_id: int
    semester_number: int
    name: str


class SubjectCreate(BaseModel):

    semester_id: int
    name: str
    code: str
    credits: int = 3


class SectionCreate(BaseModel):

    semester_id: int
    name: str
    capacity: int = 60


class StudentAccountCreate(BaseModel):

    username: str
    password: str
    confirm_password: str


class StudentSemesterUpdate(BaseModel):

    semester_id: int


class AttendanceCreate(BaseModel):

    student_id: int
    subject_id: int
    attendance_date: str
    status: str


class MarksCreate(BaseModel):

    student_id: int
    subject_id: int
    internal_marks: float
    external_marks: float


class TimetableCreate(BaseModel):

    semester_id: int
    subject_id: int
    day_of_week: str
    start_time: str
    end_time: str
    room: str


class NoticeCreate(BaseModel):

    title: str
    content: str
    notice_type: str


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {
        "message": "Student Management System API is running",
        "status": "success"
    }


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }


# ==========================================
# ADMIN LOGIN
# ==========================================

@app.post("/login")
def login(login_data: LoginRequest):

    username = login_data.username
    password = login_data.password

    try:

        admin = authenticate_admin(
            username,
            password
        )

        if admin:

            return {
                "message": "Login successful",
                "status": "success",
                **admin
            }

        return {
            "message": "Invalid username or password",
            "status": "failed"
        }


    except Exception as error:

        return {
            "message": "Login failed",
            "status": "error",
            "error": str(error)
        }


@app.post("/faculty/login")
def faculty_login(login_data: LoginRequest):

    faculty = authenticate_faculty(
        login_data.username,
        login_data.password
    )

    if faculty:
        return {
            "message": "Faculty login successful",
            "status": "success",
            "user_type": "faculty",
            **faculty
        }

    return {
        "message": "Invalid faculty username or password",
        "status": "failed"
    }


@app.get("/faculty/students")
def get_faculty_students(
    username: str = Query(..., description="Faculty username")
):
    return get_faculty_students_api(username)


# ==========================================
# ADMIN MANAGEMENT
# ==========================================

@app.get("/admin/accounts")
def get_admin_accounts(
    username: str = Query(..., description="Administrator username")
):
    return get_admins_api(username)


@app.post("/admin/accounts")
def create_admin_account(
    data: AdminCreate,
    username: str = Query(..., description="Administrator username")
):
    return create_admin_api(
        username,
        data.username,
        data.password,
        data.confirm_password,
        data.role
    )


def require_administrator(username):
    if not has_admin_role(username, "Administrator"):
        raise HTTPException(
            status_code=403,
            detail="Administrator permission is required for this action."
        )


@app.put("/admin/accounts/{admin_id}/status")
def update_admin_status(
    admin_id: int,
    username: str = Query(..., description="Administrator username")
):
    return update_admin_status_api(username, admin_id)


@app.put("/admin/accounts/{admin_id}/role")
def update_admin_role(
    admin_id: int,
    data: AdminRoleUpdate,
    username: str = Query(..., description="Administrator username")
):
    return update_admin_role_api(username, admin_id, data.role)


@app.get("/admin/faculty")
def get_faculty(
    username: str = Query(..., description="Administrator username")
):
    return get_faculty_api(username)


@app.post("/admin/faculty")
def create_faculty(
    data: FacultyCreate,
    username: str = Query(..., description="Administrator username")
):
    return create_faculty_api(
        username,
        data.name,
        data.email,
        data.phone,
        data.department_id,
        data.designation,
        data.username,
        data.password,
        data.confirm_password
    )


@app.get("/admin/courses")
def get_courses(
    username: str = Query(..., description="Administrator username")
):
    return get_courses_api(username)


@app.post("/admin/courses")
def create_course(
    data: CourseCreate,
    username: str = Query(..., description="Administrator username")
):
    return create_course_api(
        username,
        data.department_id,
        data.name,
        data.code,
        data.duration_years
    )


@app.get("/admin/semesters")
def get_semesters(
    username: str = Query(..., description="Administrator username")
):
    return get_semesters_api(username)


@app.post("/admin/semesters")
def create_semester(
    data: SemesterCreate,
    username: str = Query(..., description="Administrator username")
):
    return create_semester_api(
        username,
        data.course_id,
        data.semester_number,
        data.name
    )


@app.get("/admin/subjects")
def get_subjects(
    username: str = Query(..., description="Administrator username")
):
    return get_subjects_api(username)


@app.post("/admin/subjects")
def create_subject(
    data: SubjectCreate,
    username: str = Query(..., description="Administrator username")
):
    return create_subject_api(
        username,
        data.semester_id,
        data.name,
        data.code,
        data.credits
    )


@app.get("/admin/sections")
def get_sections(
    username: str = Query(..., description="Administrator username")
):
    return get_sections_api(username)


@app.post("/admin/sections")
def create_section(
    data: SectionCreate,
    username: str = Query(..., description="Administrator username")
):
    return create_section_api(username, data.semester_id, data.name, data.capacity)


@app.post("/admin/students/{student_id}/account")
def create_student_account(
    student_id: int,
    data: StudentAccountCreate,
    username: str = Query(..., description="Administrator username")
):
    return create_student_account_api(
        username,
        student_id,
        data.username,
        data.password,
        data.confirm_password
    )


@app.put("/admin/students/{student_id}/semester")
def assign_student_semester(
    student_id: int,
    data: StudentSemesterUpdate,
    username: str = Query(..., description="Administrator username")
):
    return assign_student_semester_api(username, student_id, data.semester_id)


@app.post("/student/login")
def student_login(login_data: LoginRequest):
    student = authenticate_student(login_data.username, login_data.password)

    if student:
        return {
            "status": "success",
            "message": "Student login successful",
            "user_type": "student",
            **student
        }

    return {
        "status": "failed",
        "message": "Invalid student username or password"
    }


@app.get("/student/subjects")
def get_student_subjects(
    username: str = Query(..., description="Student username")
):
    return get_student_subjects_api(username)


@app.post("/admin/attendance")
def record_attendance(
    data: AttendanceCreate,
    username: str = Query(..., description="Administrator username")
):
    return record_attendance_api(
        username,
        data.student_id,
        data.subject_id,
        data.attendance_date,
        data.status
    )


@app.get("/faculty/attendance-options")
def get_faculty_attendance_options(
    username: str = Query(..., description="Faculty username")
):
    return get_faculty_attendance_options_api(username)


@app.post("/faculty/attendance")
def record_faculty_attendance(
    data: AttendanceCreate,
    username: str = Query(..., description="Faculty username")
):
    return record_faculty_attendance_api(
        username,
        data.student_id,
        data.subject_id,
        data.attendance_date,
        data.status
    )


@app.get("/student/attendance")
def get_student_attendance(
    username: str = Query(..., description="Student username")
):
    return get_student_attendance_api(username)


@app.post("/admin/marks")
def record_marks(
    data: MarksCreate,
    username: str = Query(..., description="Administrator username")
):
    return record_marks_api(
        username,
        data.student_id,
        data.subject_id,
        data.internal_marks,
        data.external_marks
    )


@app.get("/faculty/marks-options")
def get_faculty_marks_options(
    username: str = Query(..., description="Faculty username")
):
    return get_faculty_marks_options_api(username)


@app.post("/faculty/marks")
def record_faculty_marks(
    data: MarksCreate,
    username: str = Query(..., description="Faculty username")
):
    return record_faculty_marks_api(
        username,
        data.student_id,
        data.subject_id,
        data.internal_marks,
        data.external_marks
    )


@app.get("/student/marks")
def get_student_marks(
    username: str = Query(..., description="Student username")
):
    return get_student_marks_api(username)


@app.get("/student/result")
def get_student_result(
    username: str = Query(..., description="Student username")
):
    return get_student_result_api(username)


@app.post("/admin/timetable")
def create_timetable(
    data: TimetableCreate,
    username: str = Query(..., description="Administrator username")
):
    return create_timetable_api(username, data.semester_id, data.subject_id, data.day_of_week, data.start_time, data.end_time, data.room)


@app.get("/student/timetable")
def get_student_timetable(
    username: str = Query(..., description="Student username")
):
    return get_student_timetable_api(username)


@app.get("/faculty/timetable")
def get_faculty_timetable(
    username: str = Query(..., description="Faculty username")
):
    return get_faculty_timetable_api(username)


@app.post("/admin/notices")
def create_notice(
    data: NoticeCreate,
    username: str = Query(..., description="Administrator username")
):
    return create_notice_api(username, data.title, data.content, data.notice_type)


@app.get("/student/notices")
def get_student_notices(
    username: str = Query(..., description="Student username")
):
    return get_student_notices_api(username)


@app.get("/faculty/notices")
def get_faculty_notices(
    username: str = Query(..., description="Faculty username")
):
    return get_faculty_notices_api(username)


# ==========================================
# GET ALL STUDENTS
# ==========================================

@app.get("/students")
def get_students(
    username: str = Query(
        ...,
        description="Admin username"
    )
):

    try:

        students = view_students(username)

        if not students:

            return {
                "message": "No students found",
                "count": 0,
                "students": []
            }

        return {
            "message": "Students retrieved successfully",
            "count": len(students),
            "students": students
        }

    except Exception as error:

        return {
            "message": "Error while retrieving students",
            "error": str(error)
        }


# ==========================================
# SEARCH STUDENTS
# ==========================================

def format_student(student):
    return {
        "student_id": student[0],
        "name": student[1],
        "email": student[2],
        "gender": student[3],
        "date_of_birth": student[4],
        "created_at": str(student[5]) if student[5] is not None else None,
        "department": student[6]
    }


@app.get("/students/name/{student_name}")
def get_students_by_name_route(student_name: str):

    try:

        students = get_students_by_name(student_name)

        if not students:
            return {
                "status": "failed",
                "message": "Student not found"
            }

        return {
            "status": "success",
            "message": "Students retrieved successfully",
            "student": format_student(students[0]),
            "students": [format_student(student) for student in students]
        }

    except Exception as error:

        return {
            "status": "error",
            "message": "Unable to search students by name",
            "error": str(error)
        }


# ==========================================
# GET STUDENT BY ID
# ==========================================

@app.get("/students/{student_id}")
def get_student(student_id: int):

    try:

        student = get_student_by_id(student_id)

        if not student:

            return {
                "status": "failed",
                "message": "Student not found"
            }

        return {
            "status": "success",
            "message": "Student retrieved successfully",
            "student": format_student(student)
        }

    except Exception as error:

        return {
            "status": "error",
            "message": "Unable to retrieve student",
            "error": str(error)
        }


# ==========================================
# ADD STUDENT
# ==========================================

@app.post("/students")
def add_student(student_data: StudentCreate):

    try:

        result = create_student(
            student_data.username,
            student_data.name,
            student_data.email,
            student_data.gender,
            student_data.dob,
            student_data.department_id
        )

        if "error" in result:

            return {
                "status": "error",
                **result
            }

        if result.get("message") != "Student added successfully":

            return {
                "status": "failed",
                **result
            }

        return {
            "status": "success",
            **result
        }

    except Exception as error:

        return {
            "status": "error",
            "message": "Unable to add student",
            "error": str(error)
        }


# ==========================================
# UPDATE STUDENT
# ==========================================

@app.put("/students/{student_id}")
def update_student(
    student_id: int,
    student_data: StudentUpdate
):

    try:

        result = update_student_api(
            student_data.username,
            student_id,
            student_data.name,
            student_data.email,
            student_data.gender,
            student_data.dob,
            student_data.department_id
        )

        if "error" in result:

            return {
                "status": "error",
                **result
            }

        if result.get("message") != "Student updated successfully":

            return {
                "status": "failed",
                **result
            }

        return {
            "status": "success",
            **result
        }

    except Exception as error:

        return {
            "status": "error",
            "message": "Unable to update student",
            "error": str(error)
        }


# ==========================================
# DELETE STUDENT BY ID
# ==========================================

@app.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    username: str = Query(
        ...,
        description="Admin username"
    )
):

    require_administrator(username)

    try:

        result = delete_student_by_id(
            student_id,
            username
        )

        if "error" in result:

            return {
                "status": "error",
                **result
            }

        if result.get("message") != "Student deleted successfully":

            return {
                "status": "failed",
                **result
            }

        return {
            "status": "success",
            **result
        }

    except Exception as error:

        return {
            "status": "error",
            "message": "Unable to delete student",
            "error": str(error)
        }


# ==========================================
# DELETE STUDENT BY NAME
# ==========================================

@app.delete("/students/name/{student_name}")
def delete_student_name(
    student_name: str,
    username: str = Query(
        ...,
        description="Admin username"
    )
):

    require_administrator(username)

    try:

        result = delete_student_by_name(
            student_name,
            username
        )

        if "error" in result:

            return {
                "status": "error",
                **result
            }

        if result.get("message") != "Student(s) deleted successfully":

            return {
                "status": "failed",
                **result
            }

        return {
            "status": "success",
            **result
        }

    except Exception as error:

        return {
            "status": "error",
            "message": "Unable to delete student by name",
            "error": str(error)
        }


# ==========================================
# ADMIN ACTIVITY LOGS
# ==========================================

@app.get("/admin/activity-logs")
def get_activity_logs(
    username: str = Query(
        ...,
        description="Admin username"
    )
):

    require_administrator(username)

    try:

        logs = view_admin_logs()

        formatted_logs = [
            {
                "id": log[0],
                "username": log[1],
                "action": log[2],
                "created_at": str(log[3])
            }
            for log in logs
        ]

        return {
            "status": "success",
            "message": "Activity logs retrieved successfully"
            if formatted_logs else "No activity logs found",
            "count": len(formatted_logs),
            "logs": formatted_logs
        }

    except Exception as error:

        return {
            "status": "error",
            "message": "Unable to retrieve activity logs",
            "error": str(error)
        }
        