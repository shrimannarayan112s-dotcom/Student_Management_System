import bcrypt

from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role, validate_password


def create_student_account_api(
    admin_username,
    student_id,
    student_username,
    password,
    confirm_password
):

    student_username = student_username.strip()

    if not student_username:
        return {"status": "error", "message": "Student username is required."}

    if password != confirm_password:
        return {"status": "error", "message": "Passwords do not match."}

    if not validate_password(password):
        return {
            "status": "error",
            "message": "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number."
        }

    if not has_admin_role(admin_username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id, name FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        if not student:
            return {"status": "error", "message": "Student not found."}

        cursor.execute(
            "SELECT id FROM students WHERE student_username = %s AND id <> %s",
            (student_username, student_id)
        )
        if cursor.fetchone():
            return {"status": "error", "message": "Student username already exists."}

        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        cursor.execute(
            """
            UPDATE students
            SET student_username = %s,
                student_password = %s,
                account_status = %s
            WHERE id = %s
            """,
            (student_username, hashed_password, "Active", student_id)
        )
        connection.commit()
        add_admin_log(admin_username, f"CREATE STUDENT ACCOUNT - ID {student_id}")

        return {
            "status": "success",
            "message": "Student account created successfully",
            "student": {
                "id": student_id,
                "name": student[1],
                "username": student_username,
                "account_status": "Active"
            }
        }

    except Exception as error:
        connection.rollback()
        return {"status": "error", "message": "Student account could not be created.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def authenticate_student(username, password):

    connection = get_connection()
    if connection is None:
        return None

    cursor = connection.cursor()

    try:
        cursor.execute(
            """
                 SELECT students.id, students.name, students.email,
                     students.gender, students.date_of_birth,
                     students.department_id, departments.name,
                     students.student_username, students.student_password,
                     students.account_status
            FROM students
                 LEFT JOIN departments ON students.department_id = departments.id
            WHERE student_username = %s
            """,
            (username,)
        )
        student = cursor.fetchone()

        if not student or student[9] != "Active" or not student[8]:
            return None

        if not bcrypt.checkpw(password.encode("utf-8"), student[8].encode("utf-8")):
            return None

        return {
            "id": student[0],
            "name": student[1],
            "email": student[2],
            "gender": student[3],
            "date_of_birth": str(student[4]),
            "department_id": student[5],
            "department": student[6],
            "username": student[7],
            "account_status": student[9]
        }

    except Exception as error:
        print("Student login error:", error)
        return None

    finally:
        cursor.close()
        connection.close()


def assign_student_semester_api(admin_username, student_id, semester_id):

    if not has_admin_role(admin_username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id, name FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        if not student:
            return {"status": "error", "message": "Student not found."}

        cursor.execute("SELECT id FROM semesters WHERE id = %s", (semester_id,))
        if not cursor.fetchone():
            return {"status": "error", "message": "Semester not found."}

        cursor.execute(
            "UPDATE students SET semester_id = %s WHERE id = %s",
            (semester_id, student_id)
        )
        connection.commit()
        add_admin_log(admin_username, f"ASSIGN STUDENT SEMESTER - ID {student_id}")

        return {
            "status": "success",
            "message": "Student semester assigned successfully",
            "student_id": student_id,
            "semester_id": semester_id
        }

    except Exception as error:
        connection.rollback()
        return {"status": "error", "message": "Unable to assign student semester.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def get_student_subjects_api(username):

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT students.id, students.name, students.semester_id
            FROM students
            WHERE students.student_username = %s
              AND students.account_status = %s
            """,
            (username, "Active")
        )
        student = cursor.fetchone()

        if not student:
            return {"status": "error", "message": "Student account not found."}

        if not student[2]:
            return {"status": "success", "message": "No semester assigned.", "subjects": []}

        cursor.execute(
            """
            SELECT subjects.id, subjects.name, subjects.code,
                   subjects.credits, semesters.name, courses.code
            FROM subjects
            INNER JOIN semesters ON subjects.semester_id = semesters.id
            INNER JOIN courses ON semesters.course_id = courses.id
            WHERE subjects.semester_id = %s
              AND subjects.status = %s
            ORDER BY subjects.id
            """,
            (student[2], "Active")
        )
        subjects = cursor.fetchall()

        return {
            "status": "success",
            "message": "Student subjects retrieved successfully",
            "student_id": student[0],
            "student_name": student[1],
            "subjects": [
                {
                    "id": item[0],
                    "name": item[1],
                    "code": item[2],
                    "credits": item[3],
                    "semester": item[4],
                    "course_code": item[5]
                }
                for item in subjects
            ]
        }

    except Exception as error:
        return {"status": "error", "message": "Unable to retrieve student subjects.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()