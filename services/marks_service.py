from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role


def record_marks_api(username, student_id, subject_id, internal_marks, external_marks):

    if not has_admin_role(username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required for marks entry."}

    if internal_marks < 0 or internal_marks > 40 or external_marks < 0 or external_marks > 70:
        return {"status": "error", "message": "Internal marks must be 0-40 and external marks must be 0-70."}

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
            INSERT INTO marks (student_id, subject_id, internal_marks, external_marks)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                internal_marks = VALUES(internal_marks),
                external_marks = VALUES(external_marks)
            """,
            (student_id, subject_id, internal_marks, external_marks)
        )
        connection.commit()
        add_admin_log(username, f"RECORD MARKS - STUDENT {student_id}")

        return {"status": "success", "message": "Marks recorded successfully"}

    except Exception as error:
        connection.rollback()
        return {"status": "error", "message": "Marks could not be recorded.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def get_faculty_marks_options_api(username):

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
            "message": "Unable to retrieve marks options.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()


def record_faculty_marks_api(
    username, student_id, subject_id, internal_marks, external_marks
):

    if internal_marks < 0 or internal_marks > 40 or external_marks < 0 or external_marks > 70:
        return {
            "status": "error",
            "message": "Internal marks must be 0-40 and external marks must be 0-70."
        }

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
            SELECT semester_id
            FROM students
            WHERE id = %s AND department_id = %s AND account_status = %s
            """,
            (student_id, faculty[0], "Active")
        )
        student = cursor.fetchone()
        if not student:
            return {"status": "error", "message": "Student is not assigned to your department."}
        if not student[0]:
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
            (subject_id, student[0], faculty[0], "Active")
        )
        if not cursor.fetchone():
            return {"status": "error", "message": "Subject is not available for this student."}

        cursor.execute(
            """
            INSERT INTO marks (student_id, subject_id, internal_marks, external_marks)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                internal_marks = VALUES(internal_marks),
                external_marks = VALUES(external_marks)
            """,
            (student_id, subject_id, internal_marks, external_marks)
        )
        connection.commit()

        return {"status": "success", "message": "Marks recorded successfully."}

    except Exception as error:
        connection.rollback()
        return {
            "status": "error",
            "message": "Marks could not be recorded.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()


def _get_grade(total):
    if total >= 90:
        return "A+"
    if total >= 80:
        return "A"
    if total >= 70:
        return "B+"
    if total >= 60:
        return "B"
    if total >= 50:
        return "C"
    if total >= 40:
        return "D"
    return "F"


def get_student_marks_api(username):

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            "SELECT id, name FROM students WHERE student_username = %s AND account_status = %s",
            (username, "Active")
        )
        student = cursor.fetchone()

        if not student:
            return {"status": "error", "message": "Student account not found."}

        cursor.execute(
            """
            SELECT subjects.name, subjects.code, marks.internal_marks,
                   marks.external_marks
            FROM marks
            INNER JOIN subjects ON marks.subject_id = subjects.id
            WHERE marks.student_id = %s
            ORDER BY subjects.id
            """,
            (student[0],)
        )
        rows = cursor.fetchall()
        marks = []
        for row in rows:
            total = row[2] + row[3]
            marks.append({
                "name": row[0],
                "code": row[1],
                "internal_marks": row[2],
                "external_marks": row[3],
                "total": total,
                "grade": _get_grade(total)
            })

        return {
            "status": "success",
            "student_id": student[0],
            "student_name": student[1],
            "marks": marks
        }

    except Exception as error:
        return {"status": "error", "message": "Unable to retrieve marks.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def get_student_result_api(username):

    marks_response = get_student_marks_api(username)

    if marks_response.get("status") != "success":
        return marks_response

    marks = marks_response.get("marks", [])
    total_marks = sum(float(mark["total"]) for mark in marks)
    maximum_marks = len(marks) * 110
    percentage = round((total_marks / maximum_marks) * 100, 2) if maximum_marks else 0

    return {
        "status": "success",
        "student_id": marks_response["student_id"],
        "student_name": marks_response["student_name"],
        "subjects": marks,
        "total_marks": total_marks,
        "maximum_marks": maximum_marks,
        "percentage": percentage,
        "result": "PASS" if marks and all(mark["grade"] != "F" for mark in marks) else "PENDING"
    }