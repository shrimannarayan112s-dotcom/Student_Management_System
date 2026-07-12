import mysql.connector

try:
    connection = mysql.connector.connect(
        host="localhost",
        user="student_user",
        password="Student@123",
        database="student_management_system"
    )

    cursor = connection.cursor()

    if connection.is_connected():
        print("✅ Database Connected Successfully")

except mysql.connector.Error as err:
    print("❌ Database Error:", err)