from database.database import get_connection
from services.admin_log_service import add_admin_log
from services.admin_service import has_admin_role


def create_timetable_api(username, semester_id, subject_id, day_of_week, start_time, end_time, room):

    if not has_admin_role(username, "Administrator"):
        return {"status": "error", "message": "Administrator permission is required for timetable management."}

    if not all((day_of_week.strip(), start_time.strip(), end_time.strip(), room.strip())):
        return {"status": "error", "message": "All timetable fields are required."}

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM semesters WHERE id = %s", (semester_id,))
        if not cursor.fetchone():
            return {"status": "error", "message": "Semester not found."}

        cursor.execute(
            "SELECT id FROM subjects WHERE id = %s AND semester_id = %s",
            (subject_id, semester_id)
        )
        if not cursor.fetchone():
            return {"status": "error", "message": "Subject is not assigned to this semester."}

        cursor.execute(
            """
            INSERT INTO timetable
                (semester_id, subject_id, day_of_week, start_time, end_time, room)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (semester_id, subject_id, day_of_week.strip(), start_time, end_time, room.strip())
        )
        connection.commit()
        add_admin_log(username, f"CREATE TIMETABLE - SUBJECT {subject_id}")
        return {"status": "success", "message": "Timetable entry created successfully"}

    except Exception as error:
        connection.rollback()
        return {"status": "error", "message": "Timetable entry could not be created.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def get_student_timetable_api(username):

    connection = get_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed."}

    cursor = connection.cursor()

    try:
        cursor.execute(
            "SELECT id, name, semester_id FROM students WHERE student_username = %s AND account_status = %s",
            (username, "Active")
        )
        student = cursor.fetchone()
        if not student:
            return {"status": "error", "message": "Student account not found."}

        if not student[2]:
            return {"status": "success", "timetable": []}

        cursor.execute(
            """
            SELECT subjects.name, subjects.code, timetable.day_of_week,
                   timetable.start_time, timetable.end_time, timetable.room
            FROM timetable
            INNER JOIN subjects ON timetable.subject_id = subjects.id
            WHERE timetable.semester_id = %s
            ORDER BY FIELD(timetable.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), timetable.start_time
            """,
            (student[2],)
        )
        rows = cursor.fetchall()

        return {
            "status": "success",
            "student_id": student[0],
            "student_name": student[1],
            "timetable": [
                {
                    "subject": row[0],
                    "code": row[1],
                    "day": row[2],
                    "start_time": str(row[3]),
                    "end_time": str(row[4]),
                    "room": row[5]
                }
                for row in rows
            ]
        }

    except Exception as error:
        return {"status": "error", "message": "Unable to retrieve timetable.", "error": str(error)}

    finally:
        cursor.close()
        connection.close()


def get_faculty_timetable_api(username):

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
            SELECT subjects.name, subjects.code, timetable.day_of_week,
                   timetable.start_time, timetable.end_time, timetable.room
            FROM timetable
            INNER JOIN subjects ON timetable.subject_id = subjects.id
            INNER JOIN semesters ON timetable.semester_id = semesters.id
            INNER JOIN courses ON semesters.course_id = courses.id
            WHERE courses.department_id = %s
            ORDER BY FIELD(timetable.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), timetable.start_time
            """,
            (faculty[0],)
        )
        rows = cursor.fetchall()

        return {
            "status": "success",
            "timetable": [
                {
                    "subject": row[0],
                    "code": row[1],
                    "day": row[2],
                    "start_time": str(row[3]),
                    "end_time": str(row[4]),
                    "room": row[5]
                }
                for row in rows
            ]
        }

    except Exception as error:
        return {
            "status": "error",
            "message": "Unable to retrieve faculty timetable.",
            "error": str(error)
        }

    finally:
        cursor.close()
        connection.close()