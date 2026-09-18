from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role

MINIMUM_SEMESTERS = 8


def ensure_default_courses(cursor):
    default_courses = [
        ("BBA", "Bachelor of Business Administration", 3),
        ("MCA", "Master of Computer Applications", 2),
    ]

    for code, name, duration_years in default_courses:
        cursor.execute(
            """
            SELECT departments.id
            FROM departments
            WHERE departments.name = %s
            """,
            (code,)
        )
        department = cursor.fetchone()

        if not department:
            continue

        cursor.execute(
            "SELECT id FROM courses WHERE code = %s",
            (code,)
        )
        if cursor.fetchone():
            continue

        cursor.execute(
            """
            INSERT INTO courses
                (department_id, name, code, duration_years, status)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (department[0], name, code, duration_years, "Active")
        )
        course_id = cursor.lastrowid
        cursor.executemany(
            """
            INSERT INTO semesters
                (course_id, semester_number, name, status)
            VALUES (%s, %s, %s, %s)
            """,
            [
                (course_id, number, f"Semester {number}", "Active")
                for number in range(1, MINIMUM_SEMESTERS + 1)
            ]
        )


def get_courses_api(username):

    if not has_admin_role(username, "Administrator"):
        return {
            "status": "error",
            "message": "Administrator permission is required for course management."
        }

    connection = get_connection()
    if connection is None:
        return {
            "status": "error",
            "message": "Database connection failed."
        }

    cursor = connection.cursor()

    try:
        ensure_default_courses(cursor)
        connection.commit()
        cursor.execute(
            """
            SELECT
                courses.id,
                courses.department_id,
                departments.name,
                courses.name,
                courses.code,
                courses.duration_years,
                courses.status,
                courses.created_at
            FROM courses
            INNER JOIN departments
                ON courses.department_id = departments.id
            ORDER BY courses.id
            """
        )
        courses = cursor.fetchall()
        add_admin_log(username, "VIEW COURSES")

        return {
            "status": "success",
            "message": "Courses retrieved successfully",
            "count": len(courses),
            "courses": [
                {
                    "id": course[0],
                    "department_id": course[1],
                    "department": course[2],
                    "name": course[3],
                    "code": course[4],
                    "duration_years": course[5],
                    "status": course[6],
                    "created_at": str(course[7])
                }
                for course in courses
            ]
        }

    except Exception as error:
        return {
            "status": "error",
            "message": "Unable to retrieve courses.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()


def create_course_api(username, department_id, name, code, duration_years):

    name = name.strip()
    code = code.strip().upper()

    if not name or not code or duration_years < 1:
        return {
            "status": "error",
            "message": "Course name, code, and a valid duration are required."
        }

    if not has_admin_role(username, "Administrator"):
        return {
            "status": "error",
            "message": "Administrator permission is required for course management."
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
            "SELECT id FROM courses WHERE code = %s",
            (code,)
        )
        if cursor.fetchone():
            return {
                "status": "error",
                "message": "Course code already exists."
            }

        cursor.execute(
            """
            INSERT INTO courses
                (department_id, name, code, duration_years, status)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (department_id, name, code, duration_years, "Active")
        )
        course_id = cursor.lastrowid
        cursor.executemany(
            """
            INSERT INTO semesters
                (course_id, semester_number, name, status)
            VALUES (%s, %s, %s, %s)
            """,
            [
                (course_id, number, f"Semester {number}", "Active")
                for number in range(1, MINIMUM_SEMESTERS + 1)
            ]
        )
        connection.commit()
        add_admin_log(username, f"CREATE COURSE - {code}")

        return {
            "status": "success",
            "message": "Course created successfully",
            "course": {
                "id": course_id,
                "department_id": department_id,
                "name": name,
                "code": code,
                "duration_years": duration_years,
                "status": "Active"
            }
        }

    except Exception as error:
        connection.rollback()
        return {
            "status": "error",
            "message": "Course could not be created.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()