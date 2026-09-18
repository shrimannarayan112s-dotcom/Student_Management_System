import bcrypt

from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role, validate_password
from utils.validation import validate_email


def authenticate_faculty(username, password):

    connection = get_connection()

    if connection is None:
        return None

    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                faculty.id,
                faculty.name,
                faculty.email,
                faculty.phone,
                faculty.designation,
                faculty.username,
                faculty.password,
                faculty.department_id,
                departments.name,
                faculty.status
            FROM faculty
            INNER JOIN departments
                ON faculty.department_id = departments.id
            WHERE faculty.username = %s
            """,
            (username,)
        )
        faculty = cursor.fetchone()

        if not faculty or faculty[9] != "Active":
            return None

        if not bcrypt.checkpw(
            password.encode("utf-8"),
            faculty[6].encode("utf-8")
        ):
            return None

        return {
            "id": faculty[0],
            "name": faculty[1],
            "email": faculty[2],
            "phone": faculty[3],
            "designation": faculty[4],
            "username": faculty[5],
            "department_id": faculty[7],
            "department": faculty[8],
            "account_status": faculty[9]
        }

    except Exception as error:

        print("Faculty login error:", error)
        return None

    finally:

        cursor.close()
        connection.close()


def get_faculty_students_api(username):

    connection = get_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Database connection failed."
        }

    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT department_id
            FROM faculty
            WHERE username = %s AND status = %s
            """,
            (username, "Active")
        )
        faculty = cursor.fetchone()

        if not faculty:
            return {
                "status": "error",
                "message": "Active faculty account not found."
            }

        cursor.execute(
            """
            SELECT students.id, students.name, students.email,
                   students.gender, students.date_of_birth,
                   departments.name, semesters.name
            FROM students
            LEFT JOIN departments ON students.department_id = departments.id
            LEFT JOIN semesters ON students.semester_id = semesters.id
            WHERE students.department_id = %s
              AND students.account_status = %s
            ORDER BY students.id
            """,
            (faculty[0], "Active")
        )
        students = cursor.fetchall()

        return {
            "status": "success",
            "message": "Faculty students retrieved successfully",
            "count": len(students),
            "students": [
                {
                    "id": student[0],
                    "name": student[1],
                    "email": student[2],
                    "gender": student[3],
                    "date_of_birth": str(student[4]),
                    "department": student[5],
                    "semester": student[6] or "Not assigned"
                }
                for student in students
            ]
        }

    except Exception as error:
        return {
            "status": "error",
            "message": "Unable to retrieve faculty students.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()


def get_faculty_api(username):

    if not has_admin_role(username, "Administrator"):
        return {
            "status": "error",
            "message": "Administrator permission is required for faculty management."
        }

    connection = get_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Database connection failed."
        }

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            faculty.id,
            faculty.name,
            faculty.email,
            faculty.phone,
            faculty.department_id,
            departments.name,
            faculty.designation,
            faculty.username,
            faculty.status,
            faculty.created_at
        FROM faculty
        INNER JOIN departments
            ON faculty.department_id = departments.id
        ORDER BY faculty.id
        """

        cursor.execute(sql)
        faculty_members = cursor.fetchall()

        add_admin_log(username, "VIEW FACULTY")

        return {
            "status": "success",
            "message": "Faculty retrieved successfully",
            "count": len(faculty_members),
            "faculty": [
                {
                    "id": member[0],
                    "name": member[1],
                    "email": member[2],
                    "phone": member[3],
                    "department_id": member[4],
                    "department": member[5],
                    "designation": member[6],
                    "username": member[7],
                    "status": member[8],
                    "created_at": str(member[9])
                }
                for member in faculty_members
            ]
        }

    except Exception as error:

        return {
            "status": "error",
            "message": "Unable to retrieve faculty.",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()


def create_faculty_api(
    username,
    name,
    email,
    phone,
    department_id,
    designation,
    faculty_username,
    password,
    confirm_password
):

    name = name.strip()
    email = email.strip().lower()
    phone = phone.strip()
    designation = designation.strip()
    faculty_username = faculty_username.strip()

    if not all((name, email, phone, designation, faculty_username)):
        return {
            "status": "error",
            "message": "All faculty fields are required."
        }

    if not validate_email(email):
        return {
            "status": "error",
            "message": "Invalid email format."
        }

    if password != confirm_password:
        return {
            "status": "error",
            "message": "Passwords do not match."
        }

    if not validate_password(password):
        return {
            "status": "error",
            "message": "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number."
        }

    if not has_admin_role(username, "Administrator"):
        return {
            "status": "error",
            "message": "Administrator permission is required for faculty management."
        }

    connection = get_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Database connection failed."
        }

    cursor = connection.cursor()

    try:

        cursor.execute(
            "SELECT id FROM departments WHERE id = %s",
            (department_id,)
        )

        if not cursor.fetchone():
            return {
                "status": "error",
                "message": "Department not found."
            }

        cursor.execute(
            """
            SELECT id
            FROM faculty
            WHERE email = %s OR username = %s
            """,
            (email, faculty_username)
        )

        if cursor.fetchone():
            return {
                "status": "error",
                "message": "Faculty email or username already exists."
            }

        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        cursor.execute(
            """
            INSERT INTO faculty
            (
                name,
                email,
                phone,
                department_id,
                designation,
                username,
                password,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                name,
                email,
                phone,
                department_id,
                designation,
                faculty_username,
                hashed_password,
                "Active"
            )
        )

        connection.commit()
        add_admin_log(username, f"CREATE FACULTY - {faculty_username}")

        return {
            "status": "success",
            "message": "Faculty created successfully",
            "faculty": {
                "id": cursor.lastrowid,
                "name": name,
                "email": email,
                "department_id": department_id,
                "designation": designation,
                "username": faculty_username,
                "status": "Active"
            }
        }

    except Exception as error:

        connection.rollback()

        return {
            "status": "error",
            "message": "Faculty could not be created.",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()