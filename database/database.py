import mysql.connector


def get_connection():
    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="student_user",
            password="Student@123",
            database="student_management_system"
        )

        print("[OK] Database Connected Successfully")

        return connection

    except mysql.connector.Error as err:
        print("[ERROR] Database Error:", err)
        return None