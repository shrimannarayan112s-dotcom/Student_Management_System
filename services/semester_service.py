from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role

MINIMUM_SEMESTERS = 8


def get_semesters_api(username):

    if not has_admin_role(username, "Administrator"):
        return {
            "status": "error",
            "message": "Administrator permission is required for semester management."
        }

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM courses")
        course_ids = [course[0] for course in cursor.fetchall()]

        for course_id in course_ids:
            cursor.execute(
                "SELECT semester_number FROM semesters WHERE course_id = %s",
                (course_id,)
            )
            existing_numbers = {row[0] for row in cursor.fetchall()}
            missing_numbers = [
                number
                for number in range(1, MINIMUM_SEMESTERS + 1)
                if number not in existing_numbers
            ]

            if missing_numbers:
                cursor.executemany(
                    """
                    INSERT INTO semesters
                        (course_id, semester_number, name, status)
                    VALUES (%s, %s, %s, %s)
                    """,
                    [
                        (course_id, number, f"Semester {number}", "Active")
                        for number in missing_numbers
                    ]
                )

        connection.commit()
        cursor.execute(
            """
            SELECT semesters.id, semesters.course_id, courses.name,
                   courses.code, semesters.semester_number, semesters.name,
                   semesters.status, semesters.created_at
            FROM semesters
            INNER JOIN courses ON semesters.course_id = courses.id
            ORDER BY semesters.course_id, semesters.semester_number
            """
        )
        semesters = cursor.fetchall()
        add_admin_log(username, "VIEW SEMESTERS")

        return {
            "status": "success",
            "message": "Semesters retrieved successfully",
            "count": len(semesters),
            "semesters": [
                {
                    "id": item[0],
                    "course_id": item[1],
                    "course": item[2],
                    "course_code": item[3],
                    "semester_number": item[4],
                    "name": item[5],
                    "status": item[6],
                    "created_at": str(item[7])
                }
                for item in semesters
            ]
        }

    except Exception as error:
        return {
            "status": "error",
            "message": "Unable to retrieve semesters.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()


def create_semester_api(username, course_id, semester_number, name):

    name = name.strip()

    if semester_number < 1 or semester_number > 12 or not name:
        return {
            "status": "error",
            "message": "Enter a valid semester number and name."
        }

    if not has_admin_role(username, "Administrator"):
        return {
            "status": "error",
            "message": "Administrator permission is required for semester management."
        }

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM courses WHERE id = %s", (course_id,))
        if not cursor.fetchone():
            return {"status": "error", "message": "Course not found."}

        cursor.execute(
            "SELECT id FROM semesters WHERE course_id = %s AND semester_number = %s",
            (course_id, semester_number)
        )
        if cursor.fetchone():
            return {"status": "error", "message": "This semester already exists for the course."}

        cursor.execute(
            """
            INSERT INTO semesters (course_id, semester_number, name, status)
            VALUES (%s, %s, %s, %s)
            """,
            (course_id, semester_number, name, "Active")
        )
        connection.commit()
        add_admin_log(username, f"CREATE SEMESTER - {name}")

        return {
            "status": "success",
            "message": "Semester created successfully",
            "semester": {
                "id": cursor.lastrowid,
                "course_id": course_id,
                "semester_number": semester_number,
                "name": name,
                "status": "Active"
            }
        }

    except Exception as error:
        connection.rollback()
        return {
            "status": "error",
            "message": "Semester could not be created.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()