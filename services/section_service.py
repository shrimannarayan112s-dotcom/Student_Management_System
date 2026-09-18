from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role


def get_sections_api(username):

    if not has_admin_role(username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required for section management."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT sections.id, sections.semester_id, semesters.name,
                   courses.code, sections.name, sections.capacity,
                   sections.status, sections.created_at
            FROM sections
            INNER JOIN semesters ON sections.semester_id = semesters.id
            INNER JOIN courses ON semesters.course_id = courses.id
            ORDER BY sections.id
            """
        )
        sections = cursor.fetchall()
        add_admin_log(username, "VIEW SECTIONS")

        return {
            "status": "success",
            "message": "Sections retrieved successfully",
            "count": len(sections),
            "sections": [
                {
                    "id": item[0],
                    "semester_id": item[1],
                    "semester": item[2],
                    "course_code": item[3],
                    "name": item[4],
                    "capacity": item[5],
                    "status": item[6],
                    "created_at": str(item[7])
                }
                for item in sections
            ]
        }

    except Exception as error:
        return {"status": "error", "message": "Unable to retrieve sections.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def create_section_api(username, semester_id, name, capacity):

    name = name.strip()

    if not name or capacity < 1:
        return {"status": "error", "message": "Section name and valid capacity are required."}

    if not has_admin_role(username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required for section management."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM semesters WHERE id = %s", (semester_id,))
        if not cursor.fetchone():
            return {"status": "error", "message": "Semester not found."}

        cursor.execute(
            "SELECT id FROM sections WHERE semester_id = %s AND name = %s",
            (semester_id, name)
        )
        if cursor.fetchone():
            return {"status": "error", "message": "Section already exists for this semester."}

        cursor.execute(
            """
            INSERT INTO sections (semester_id, name, capacity, status)
            VALUES (%s, %s, %s, %s)
            """,
            (semester_id, name, capacity, "Active")
        )
        connection.commit()
        add_admin_log(username, f"CREATE SECTION - {name}")

        return {
            "status": "success",
            "message": "Section created successfully",
            "section": {
                "id": cursor.lastrowid,
                "semester_id": semester_id,
                "name": name,
                "capacity": capacity,
                "status": "Active"
            }
        }

    except Exception as error:
        connection.rollback()
        return {"status": "error", "message": "Section could not be created.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()