from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role


def record_attendance_api(username, student_id, subject_id, attendance_date, status):

    if not has_admin_role(username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required for attendance entry."}

    if status not in ("Present", "Absent"):
        return {"status": "error", "message": "Attendance status must be Present or Absent."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM students WHERE id = %s", (student_id,))
        if not cursor.fetchone():
            return {"status": "error", "message": "Student not found."}

        cursor.execute("SELECT id FROM subjects WHERE id = %s", (subject_id,))
        if not cursor.fetchone():
            return {"status": "error", "message": "Subject not found."}

        cursor.execute(
            """
            INSERT INTO attendance (student_id, subject_id, attendance_date, status)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
            """,
            (student_id, subject_id, attendance_date, status)
        )
        connection.commit()
        add_admin_log(username, f"RECORD ATTENDANCE - STUDENT {student_id}")

        return {"status": "success", "message": "Attendance recorded successfully"}

    except Exception as error:
        connection.rollback()
        return {"status": "error", "message": "Attendance could not be recorded.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def get_faculty_attendance_options_api(username):

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            "SELECT department_id FROM faculty WHERE username = %s AND status = %s",
            (username, "Active")
        )
        faculty = cursor.fetchone()

        if not faculty:
            return {"status": "error", "message": "Active faculty account not found."}

        cursor.execute(
            """
            SELECT id, name, semester_id
            FROM students
            WHERE department_id = %s AND account_status = %s
            ORDER BY id
            """,
            (faculty[0], "Active")
        )
        students = cursor.fetchall()

        cursor.execute(
            """
            SELECT subjects.id, subjects.name, subjects.code, subjects.semester_id
            FROM subjects
            INNER JOIN semesters ON subjects.semester_id = semesters.id
            INNER JOIN courses ON semesters.course_id = courses.id
            WHERE courses.department_id = %s AND subjects.status = %s
            ORDER BY subjects.id
            """,
            (faculty[0], "Active")
        )
        subjects = cursor.fetchall()

        return {
            "status": "success",
            "students": [
                {"id": item[0], "name": item[1], "semester_id": item[2]}
                for item in students
            ],
            "subjects": [
                {
                    "id": item[0],
                    "name": item[1],
                    "code": item[2],
                    "semester_id": item[3]
                }
                for item in subjects
            ]
        }

    except Exception as error:
        return {
            "status": "error",
            "message": "Unable to retrieve attendance options.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()


def record_faculty_attendance_api(
    username, student_id, subject_id, attendance_date, status
):

    if status not in ("Present", "Absent"):
        return {"status": "error", "message": "Attendance status must be Present or Absent."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            "SELECT department_id FROM faculty WHERE username = %s AND status = %s",
            (username, "Active")
        )
        faculty = cursor.fetchone()
        if not faculty:
            return {"status": "error", "message": "Active faculty account not found."}

        cursor.execute(
            """
            SELECT id, semester_id
            FROM students
            WHERE id = %s AND department_id = %s AND account_status = %s
            """,
            (student_id, faculty[0], "Active")
        )
        student = cursor.fetchone()
        if not student:
            return {"status": "error", "message": "Student is not assigned to your department."}
        if not student[1]:
            return {"status": "error", "message": "Student has no semester assigned."}

        cursor.execute(
            """
            SELECT subjects.id
            FROM subjects
            INNER JOIN semesters ON subjects.semester_id = semesters.id
            INNER JOIN courses ON semesters.course_id = courses.id
            WHERE subjects.id = %s
              AND subjects.semester_id = %s
              AND courses.department_id = %s
              AND subjects.status = %s
            """,
            (subject_id, student[1], faculty[0], "Active")
        )
        if not cursor.fetchone():
            return {"status": "error", "message": "Subject is not available for this student."}

        cursor.execute(
            """
            INSERT INTO attendance (student_id, subject_id, attendance_date, status)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
            """,
            (student_id, subject_id, attendance_date, status)
        )
        connection.commit()

        return {"status": "success", "message": "Attendance recorded successfully."}

    except Exception as error:
        connection.rollback()
        return {
            "status": "error",
            "message": "Attendance could not be recorded.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()


def get_student_attendance_api(username):

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT id, name
            FROM students
            WHERE student_username = %s AND account_status = %s
            """,
            (username, "Active")
        )
        student = cursor.fetchone()

        if not student:
            return {"status": "error", "message": "Student account not found."}

        cursor.execute(
            """
            SELECT subjects.name, subjects.code,
                   COUNT(attendance.id),
                   SUM(CASE WHEN attendance.status = 'Present' THEN 1 ELSE 0 END)
            FROM attendance
            INNER JOIN subjects ON attendance.subject_id = subjects.id
            WHERE attendance.student_id = %s
            GROUP BY subjects.id, subjects.name, subjects.code
            ORDER BY subjects.id
            """,
            (student[0],)
        )
        rows = cursor.fetchall()

        subjects = []
        for row in rows:
            total = row[2]
            present = row[3] or 0
            subjects.append({
                "name": row[0],
                "code": row[1],
                "total_classes": total,
                "present_classes": present,
                "absent_classes": total - present,
                "percentage": round((present / total) * 100, 2) if total else 0
            })

        return {
            "status": "success",
            "student_id": student[0],
            "student_name": student[1],
            "subjects": subjects
        }

    except Exception as error:
        return {"status": "error", "message": "Unable to retrieve attendance.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()