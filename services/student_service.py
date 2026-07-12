from database.database import connection, cursor
from models.student import Student


# ==========================
# 1. Add Student
# ==========================
def add_student():
    print("\n========== Add Student ==========")

    name = input("Enter Name: ")
    email = input("Enter Email: ")
    gender = input("Enter Gender: ")
    dob = input("Enter Date of Birth (YYYY-MM-DD): ")

    student = Student(name, email, gender, dob)

    sql = """
    INSERT INTO students(name, email, gender, date_of_birth)
    VALUES (%s, %s, %s, %s)
    """

    values = (
        student.name,
        student.email,
        student.gender,
        student.dob
    )

    cursor.execute(sql, values)
    connection.commit()

    print("\n✅ Student Added Successfully!")


# ==========================
# 2. View Students
# ==========================
def view_students():

    sql = "SELECT * FROM students"

    cursor.execute(sql)

    students = cursor.fetchall()

    if not students:
        print("\n❌ No Students Found.")
        return

    print("\n========== Student List ==========\n")

    for student in students:
        print(f"ID             : {student[0]}")
        print(f"Name           : {student[1]}")
        print(f"Email          : {student[2]}")
        print(f"Gender         : {student[3]}")
        print(f"Date of Birth  : {student[4]}")
        print(f"Created At     : {student[5]}")
        print("-" * 40)


# ==========================
# 3. Search Student
# ==========================
def search_student():

    student_id = input("Enter Student ID: ")

    sql = "SELECT * FROM students WHERE id=%s"

    cursor.execute(sql, (student_id,))

    student = cursor.fetchone()

    if student:
        print("\n========== Student Found ==========")
        print(f"ID             : {student[0]}")
        print(f"Name           : {student[1]}")
        print(f"Email          : {student[2]}")
        print(f"Gender         : {student[3]}")
        print(f"Date of Birth  : {student[4]}")
        print(f"Created At     : {student[5]}")
    else:
        print("\n❌ Student Not Found.")


# ==========================
# 4. Update Student
# ==========================
def update_student():

    student_id = input("Enter Student ID to Update: ")

    sql = "SELECT * FROM students WHERE id=%s"

    cursor.execute(sql, (student_id,))

    student = cursor.fetchone()

    if not student:
        print("\n❌ Student Not Found.")
        return

    print("\nEnter New Student Details")

    name = input("Enter New Name: ")
    email = input("Enter New Email: ")
    gender = input("Enter New Gender: ")
    dob = input("Enter New Date of Birth (YYYY-MM-DD): ")

    sql = """
    UPDATE students
    SET
        name=%s,
        email=%s,
        gender=%s,
        date_of_birth=%s
    WHERE id=%s
    """

    values = (
        name,
        email,
        gender,
        dob,
        student_id
    )

    cursor.execute(sql, values)
    connection.commit()

    print("\n✅ Student Updated Successfully!")


# ==========================
# 5. Delete Student
# ==========================
def delete_student():

    student_id = input("Enter Student ID to Delete: ")

    sql = "DELETE FROM students WHERE id=%s"

    cursor.execute(sql, (student_id,))
    connection.commit()

    if cursor.rowcount > 0:
        print("\n✅ Student Deleted Successfully!")
    else:
        print("\n❌ Student Not Found.")