from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role


def create_notice_api(username, title, content, notice_type):

    if not has_admin_role(username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required for notice management."}

    title = title.strip()
    content = content.strip()
    notice_type = notice_type.strip()

    if not title or not content or not notice_type:
        return {"status": "error", "message": "Title, content, and notice type are required."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            "INSERT INTO notices (title, content, notice_type, created_by) VALUES (%s, %s, %s, %s)",
            (title, content, notice_type, username)
        )
        connection.commit()
        add_admin_log(username, f"CREATE NOTICE - {title}")
        return {"status": "success", "message": "Notice created successfully"}

    except Exception as error:
        connection.rollback()
        return {"status": "error", "message": "Notice could not be created.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def get_student_notices_api(username):

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            "SELECT id FROM students WHERE student_username = %s AND account_status = %s",
            (username, "Active")
        )
        if not cursor.fetchone():
            return {"status": "error", "message": "Student account not found."}

        cursor.execute(
            """
            SELECT id, title, content, notice_type, created_by, created_at
            FROM notices
            WHERE status = 'Published'
            ORDER BY id DESC
            """
        )
        notices = cursor.fetchall()

        return {
            "status": "success",
            "notices": [
                {
                    "id": notice[0],
                    "title": notice[1],
                    "content": notice[2],
                    "notice_type": notice[3],
                    "created_by": notice[4],
                    "created_at": str(notice[5])
                }
                for notice in notices
            ]
        }

    except Exception as error:
        return {"status": "error", "message": "Unable to retrieve notices.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def get_faculty_notices_api(username):

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            "SELECT id FROM faculty WHERE username = %s AND status = %s",
            (username, "Active")
        )
        if not cursor.fetchone():
            return {"status": "error", "message": "Active faculty account not found."}

        cursor.execute(
            """
            SELECT id, title, content, notice_type, created_by, created_at
            FROM notices
            WHERE status = %s
            ORDER BY id DESC
            """,
            ("Published",)
        )
        notices = cursor.fetchall()

        return {
            "status": "success",
            "notices": [
                {
                    "id": notice[0],
                    "title": notice[1],
                    "content": notice[2],
                    "notice_type": notice[3],
                    "created_by": notice[4],
                    "created_at": str(notice[5])
                }
                for notice in notices
            ]
        }

    except Exception as error:
        return {
            "status": "error",
            "message": "Unable to retrieve faculty notices.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()