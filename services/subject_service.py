from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role


def get_subjects_api(username):

    if not has_admin_role(username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required for subject management."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT subjects.id, subjects.semester_id, semesters.name,
                   courses.code, subjects.name, subjects.code,
                   subjects.credits, subjects.status, subjects.created_at
            FROM subjects
            INNER JOIN semesters ON subjects.semester_id = semesters.id
            INNER JOIN courses ON semesters.course_id = courses.id
            ORDER BY subjects.id
            """
        )
        subjects = cursor.fetchall()
        add_admin_log(username, "VIEW SUBJECTS")

        return {
            "status": "success",
            "message": "Subjects retrieved successfully",
            "count": len(subjects),
            "subjects": [
                {
                    "id": item[0],
                    "semester_id": item[1],
                    "semester": item[2],
                    "course_code": item[3],
                    "name": item[4],
                    "code": item[5],
                    "credits": item[6],
                    "status": item[7],
                    "created_at": str(item[8])
                }
                for item in subjects
            ]
        }

    except Exception as error:
        return {"status": "error", "message": "Unable to retrieve subjects.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def create_subject_api(username, semester_id, name, code, credits):

    name = name.strip()
    code = code.strip().upper()

    if not name or not code or credits < 1:
        return {"status": "error", "message": "Subject name, code, and valid credits are required."}

    if not has_admin_role(username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required for subject management."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM semesters WHERE id = %s", (semester_id,))
        if not cursor.fetchone():
            return {"status": "error", "message": "Semester not found."}

        cursor.execute("SELECT id FROM subjects WHERE code = %s", (code,))
        if cursor.fetchone():
            return {"status": "error", "message": "Subject code already exists."}

        cursor.execute(
            """
            INSERT INTO subjects (semester_id, name, code, credits, status)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (semester_id, name, code, credits, "Active")
        )
        connection.commit()
        add_admin_log(username, f"CREATE SUBJECT - {code}")

        return {
            "status": "success",
            "message": "Subject created successfully",
            "subject": {
                "id": cursor.lastrowid,
                "semester_id": semester_id,
                "name": name,
                "code": code,
                "credits": credits,
                "status": "Active"
            }
        }

    except Exception as error:
        connection.rollback()
        return {"status": "error", "message": "Subject could not be created.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()