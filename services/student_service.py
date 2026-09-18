from database.database import get_connection
from models.student import Student
from utils.validation import validate_email, validate_dob
from services.admin_log_service import add_admin_log


# ==========================
# Get Departments
# ==========================

def get_departments():

    connection = get_connection()

    if connection is None:
        return []

    cursor = connection.cursor()

    try:

        sql = """
        SELECT id, name
        FROM departments
        ORDER BY id
        """

        cursor.execute(sql)

        departments = cursor.fetchall()

        return departments

    except Exception as error:

        print("\n❌ Database Error!")
        print("Unable to load departments.")
        print("Error:", error)

        return []

    finally:

        cursor.close()
        connection.close()


# ==========================
# Get Gender
# ==========================

def get_gender(current_gender=None):

    print("\n========== Gender ==========")
    print("1. Male")
    print("2. Female")
    print("3. Other")

    if current_gender:
        print(f"Current Gender: {current_gender}")

    choice = input(
        "Enter Gender "
        "(press Enter to keep current): "
    ).strip()

    if choice == "":
        return current_gender

    if choice == "1":
        return "Male"

    elif choice == "2":
        return "Female"

    elif choice == "3":
        return "Other"

    else:

        print("\n❌ Invalid Gender!")
        print("Please select 1, 2 or 3.")

        return None


# ==========================
# Display Student
# ==========================

def display_student(student):

    print("\n========== Student Details ==========")

    print(f"ID             : {student[0]}")
    print(f"Name           : {student[1]}")
    print(f"Email          : {student[2]}")
    print(f"Gender         : {student[3]}")
    print(f"Date of Birth  : {student[4]}")
    print(f"Department     : {student[6]}")
    print(f"Created At     : {student[5]}")


# ==========================
# 1. Add Student - CLI
# ==========================

def add_student(username):

    print("\n========== Add Student ==========")

    name = input("Enter Name: ").strip()

    email = input("Enter Email: ").strip()

    if not validate_email(email):

        print("\n❌ Invalid Email Format!")

        return

    gender = get_gender()

    if gender is None:
        return

    dob = input(
        "Enter Date of Birth (YYYY-MM-DD): "
    ).strip()

    if not validate_dob(dob):

        print("\n❌ Invalid Date Format!")
        print("Please use YYYY-MM-DD format.")

        return

    print("\n========== Departments ==========")

    departments = get_departments()

    if not departments:

        print("\n❌ No Departments Found.")

        return

    for department in departments:

        print(
            f"{department[0]}. {department[1]}"
        )

    department_id = input(
        "Enter Department ID: "
    ).strip()

    valid_department_ids = []

    for department in departments:

        valid_department_ids.append(
            str(department[0])
        )

    if department_id not in valid_department_ids:

        print("\n❌ Invalid Department ID!")
        print("Please select a valid department.")

        return

    connection = get_connection()

    if connection is None:
        return

    cursor = connection.cursor()

    try:

        sql = """
        SELECT id, name
        FROM students
        WHERE email = %s
        """

        cursor.execute(
            sql,
            (email,)
        )

        existing_student = cursor.fetchone()

        if existing_student:

            print("\n❌ Email already exists!")

            print(
                f"This email is already registered with "
                f"Student ID {existing_student[0]} "
                f"({existing_student[1]})."
            )

            print(
                "Please use a different email address."
            )

            return

        student = Student(
            name,
            email,
            gender,
            dob,
            department_id
        )

        sql = """
        INSERT INTO students
        (name, email, gender, date_of_birth, department_id)
        VALUES (%s, %s, %s, %s, %s)
        """

        values = (
            student.name,
            student.email,
            student.gender,
            student.dob,
            student.department_id
        )

        cursor.execute(
            sql,
            values
        )

        connection.commit()

        print("\n✅ Student Added Successfully!")

        add_admin_log(
            username,
            f"ADD STUDENT - {name}"
        )

    except Exception as error:

        connection.rollback()

        print("\n❌ Database Error!")
        print("Student could not be added.")
        print("Error:", error)

    finally:

        cursor.close()
        connection.close()


# ==========================
# 2. View Students
# ==========================

def view_students(username):

    connection = get_connection()

    if connection is None:
        return []

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            students.id,
            students.name,
            students.email,
            students.gender,
            students.date_of_birth,
            students.created_at,
            departments.name
        FROM students
        LEFT JOIN departments
        ON students.department_id = departments.id
        ORDER BY students.id
        """

        cursor.execute(sql)

        students = cursor.fetchall()

        print("\n========== Student List ==========\n")

        if not students:

            print("❌ No Students Found.")

        else:

            for student in students:

                display_student(student)

                print("-" * 40)

        add_admin_log(
            username,
            "VIEW STUDENTS"
        )

        return students

    except Exception as error:

        print("\n❌ Database Error!")
        print("Unable to fetch students.")
        print("Error:", error)

        return []

    finally:

        cursor.close()
        connection.close()


# ==========================
# Get Student by ID - API
# ==========================

def get_student_by_id(student_id):

    connection = get_connection()

    if connection is None:
        return None

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            students.id,
            students.name,
            students.email,
            students.gender,
            students.date_of_birth,
            students.created_at,
            departments.name
        FROM students
        LEFT JOIN departments
        ON students.department_id = departments.id
        WHERE students.id = %s
        """

        cursor.execute(
            sql,
            (student_id,)
        )

        student = cursor.fetchone()

        return student

    except Exception as error:

        print("\n❌ Database Error!")
        print("Unable to fetch student.")
        print("Error:", error)

        return None

    finally:

        cursor.close()
        connection.close()


# ==========================
# Search Students by Name - API
# ==========================

def get_students_by_name(name):

    connection = get_connection()

    if connection is None:
        return []

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            students.id,
            students.name,
            students.email,
            students.gender,
            students.date_of_birth,
            students.created_at,
            departments.name
        FROM students
        LEFT JOIN departments
        ON students.department_id = departments.id
        WHERE students.name = %s
        ORDER BY students.id
        """

        cursor.execute(sql, (name.strip(),))

        return cursor.fetchall()

    except Exception as error:

        print("\n❌ Database Error!")
        print("Unable to search students by name.")
        print("Error:", error)

        return []

    finally:

        cursor.close()
        connection.close()


# ==========================
# Search Student by ID
# ==========================

def search_by_id(username):

    student_id = input(
        "Enter Student ID: "
    ).strip()

    connection = get_connection()

    if connection is None:
        return

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            students.id,
            students.name,
            students.email,
            students.gender,
            students.date_of_birth,
            students.created_at,
            departments.name
        FROM students
        LEFT JOIN departments
        ON students.department_id = departments.id
        WHERE students.id = %s
        """

        cursor.execute(
            sql,
            (student_id,)
        )

        student = cursor.fetchone()

        if student:

            display_student(student)

        else:

            print("\n❌ Student Not Found.")

        add_admin_log(
            username,
            f"SEARCH STUDENT BY ID - {student_id}"
        )

    except Exception as error:

        print("\n❌ Database Error!")
        print("Unable to search student.")
        print("Error:", error)

    finally:

        cursor.close()
        connection.close()


# ==========================
# Search Student by Name
# ==========================

def search_by_name(username):

    name = input(
        "Enter Student Name: "
    ).strip()

    connection = get_connection()

    if connection is None:
        return

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            students.id,
            students.name,
            students.email,
            students.gender,
            students.date_of_birth,
            students.created_at,
            departments.name
        FROM students
        LEFT JOIN departments
        ON students.department_id = departments.id
        WHERE students.name = %s
        ORDER BY students.id
        """

        cursor.execute(
            sql,
            (name,)
        )

        students = cursor.fetchall()

        if not students:

            print("\n❌ No Students Found.")

        else:

            print("\n========== Search Results ==========")

            for student in students:

                display_student(student)

                print("-" * 40)

        add_admin_log(
            username,
            f"SEARCH STUDENT BY NAME - {name}"
        )

    except Exception as error:

        print("\n❌ Database Error!")
        print("Unable to search students.")
        print("Error:", error)

    finally:

        cursor.close()
        connection.close()


# ==========================
# 3. Search Student
# ==========================

def search_student(username):

    while True:

        print("\n========== Search Student ==========")

        print("1. Search by ID")
        print("2. Search by Name")
        print("3. Back")

        choice = input(
            "Enter your choice: "
        ).strip()

        if choice == "1":

            search_by_id(username)

        elif choice == "2":

            search_by_name(username)

        elif choice == "3":

            break

        else:

            print("\n❌ Invalid Choice!")


# ==========================
# 4. Update Student - CLI
# ==========================

def update_student(username):

    student_id = input(
        "Enter Student ID to Update: "
    ).strip()

    connection = get_connection()

    if connection is None:
        return

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            students.id,
            students.name,
            students.email,
            students.gender,
            students.date_of_birth,
            students.department_id,
            departments.name
        FROM students
        LEFT JOIN departments
        ON students.department_id = departments.id
        WHERE students.id = %s
        """

        cursor.execute(
            sql,
            (student_id,)
        )

        student = cursor.fetchone()

        if not student:

            print("\n❌ Student Not Found.")

            return

        print(
            "\n========== Current Student Details =========="
        )

        print(f"ID             : {student[0]}")
        print(f"Name           : {student[1]}")
        print(f"Email          : {student[2]}")
        print(f"Gender         : {student[3]}")
        print(f"Date of Birth  : {student[4]}")
        print(f"Department     : {student[6]}")

        print("\n========== Update Student ==========")

        name = input(
            f"Enter New Name "
            f"(press Enter to keep '{student[1]}'): "
        ).strip()

        if name == "":
            name = student[1]

        email = input(
            f"Enter New Email "
            f"(press Enter to keep '{student[2]}'): "
        ).strip()

        if email == "":

            email = student[2]

        else:

            if not validate_email(email):

                print("\n❌ Invalid Email Format!")

                return

            sql = """
            SELECT id, name
            FROM students
            WHERE email = %s
            AND id != %s
            """

            cursor.execute(
                sql,
                (email, student_id)
            )

            existing_student = cursor.fetchone()

            if existing_student:

                print("\n❌ Email already exists!")

                print(
                    f"This email is already registered with "
                    f"Student ID {existing_student[0]} "
                    f"({existing_student[1]})."
                )

                print(
                    "Please use a different email address."
                )

                return

        gender = get_gender(
            student[3]
        )

        if gender is None:
            return

        dob = input(
            f"Enter New Date of Birth "
            f"(press Enter to keep '{student[4]}'): "
        ).strip()

        if dob == "":

            dob = student[4]

        else:

            if not validate_dob(dob):

                print("\n❌ Invalid Date Format!")
                print(
                    "Please use YYYY-MM-DD format."
                )

                return

        print("\n========== Departments ==========")

        departments = get_departments()

        if not departments:

            print("\n❌ No Departments Found.")

            return

        for department in departments:

            print(
                f"{department[0]}. {department[1]}"
            )

        department_id = input(
            "Enter New Department ID "
            "(press Enter to keep current): "
        ).strip()

        if department_id == "":

            department_id = str(
                student[5]
            )

        else:

            valid_department_ids = []

            for department in departments:

                valid_department_ids.append(
                    str(department[0])
                )

            if department_id not in valid_department_ids:

                print("\n❌ Invalid Department ID!")
                print(
                    "Please select a valid department."
                )

                return

        sql = """
        UPDATE students
        SET
            name = %s,
            email = %s,
            gender = %s,
            date_of_birth = %s,
            department_id = %s
        WHERE id = %s
        """

        values = (
            name,
            email,
            gender,
            dob,
            department_id,
            student_id
        )

        cursor.execute(
            sql,
            values
        )

        connection.commit()

        print("\n✅ Student Updated Successfully!")

        add_admin_log(
            username,
            f"UPDATE STUDENT - ID {student_id}"
        )

    except Exception as error:

        connection.rollback()

        print("\n❌ Database Error!")
        print("Student could not be updated.")
        print("Error:", error)

    finally:

        cursor.close()
        connection.close()


# ==========================
# 5. Delete Student - CLI
# ==========================

def delete_student(username):

    student_id = input(
        "Enter Student ID to Delete: "
    ).strip()

    connection = get_connection()

    if connection is None:
        return

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            students.id,
            students.name,
            students.email,
            students.gender,
            students.date_of_birth,
            students.department_id,
            departments.name
        FROM students
        LEFT JOIN departments
        ON students.department_id = departments.id
        WHERE students.id = %s
        """

        cursor.execute(
            sql,
            (student_id,)
        )

        student = cursor.fetchone()

        if not student:

            print("\n❌ Student Not Found.")

            return

        print("\n========== Student Details ==========")

        print(f"ID             : {student[0]}")
        print(f"Name           : {student[1]}")
        print(f"Email          : {student[2]}")
        print(f"Gender         : {student[3]}")
        print(f"Date of Birth  : {student[4]}")
        print(f"Department     : {student[6]}")

        while True:

            confirmation = input(
                "\nAre you sure you want to delete "
                "this student? (y/n): "
            ).lower().strip()

            if confirmation in ("y", "yes"):

                break

            elif confirmation in ("n", "no"):

                print("\n❌ Delete Cancelled.")

                return

            else:

                print("\n❌ Please enter only y or n.")

        sql = """
        DELETE FROM students
        WHERE id = %s
        """

        cursor.execute(
            sql,
            (student_id,)
        )

        connection.commit()

        print("\n✅ Student Deleted Successfully!")

        add_admin_log(
            username,
            f"DELETE STUDENT - ID {student_id}"
        )

    except Exception as error:

        connection.rollback()

        print("\n❌ Database Error!")
        print("Student could not be deleted.")
        print("Error:", error)

    finally:

        cursor.close()
        connection.close()


# ==========================
# 6. Student Dashboard
# ==========================

def student_dashboard(username):

    connection = get_connection()

    if connection is None:
        return

    cursor = connection.cursor()

    try:

        sql = "SELECT COUNT(*) FROM students"

        cursor.execute(sql)

        total_students = cursor.fetchone()[0]

        sql = """
        SELECT gender, COUNT(*)
        FROM students
        GROUP BY gender
        """

        cursor.execute(sql)

        gender_data = cursor.fetchall()

        gender_counts = {
            "Male": 0,
            "Female": 0,
            "Other": 0
        }

        for gender, count in gender_data:

            if gender in gender_counts:

                gender_counts[gender] = count

        sql = """
        SELECT
            departments.name,
            COUNT(students.id)
        FROM departments
        LEFT JOIN students
        ON departments.id = students.department_id
        GROUP BY departments.id, departments.name
        ORDER BY departments.id
        """

        cursor.execute(sql)

        department_data = cursor.fetchall()

        print("\n========== Student Dashboard ==========")

        print(
            f"\nTotal Students    : {total_students}"
        )

        print(
            "\n========== Gender Statistics =========="
        )

        print(
            f"Male              : "
            f"{gender_counts['Male']}"
        )

        print(
            f"Female            : "
            f"{gender_counts['Female']}"
        )

        print(
            f"Other             : "
            f"{gender_counts['Other']}"
        )

        print(
            "\n========== Department Statistics =========="
        )

        for department, count in department_data:

            print(
                f"{department:<18}: {count}"
            )

        add_admin_log(
            username,
            "VIEW DASHBOARD"
        )

    except Exception as error:

        print("\n❌ Database Error!")
        print("Unable to load dashboard.")
        print("Error:", error)

    finally:

        cursor.close()
        connection.close()


# ==========================
# CREATE STUDENT - FASTAPI
# ==========================

def create_student(
    username,
    name,
    email,
    gender,
    dob,
    department_id
):

    connection = get_connection()

    if connection is None:

        return {
            "message": "Database connection failed"
        }

    cursor = connection.cursor()

    try:

        if not validate_email(email):

            return {
                "message": "Invalid email format"
            }

        if not validate_dob(dob):

            return {
                "message": "Invalid date of birth format. Use YYYY-MM-DD"
            }

        sql = """
        SELECT id, name
        FROM departments
        WHERE id = %s
        """

        cursor.execute(
            sql,
            (department_id,)
        )

        department = cursor.fetchone()

        if not department:

            return {
                "message": "Invalid department ID"
            }

        sql = """
        SELECT id, name
        FROM students
        WHERE email = %s
        """

        cursor.execute(
            sql,
            (email,)
        )

        existing_student = cursor.fetchone()

        if existing_student:

            return {
                "message": "Email already exists",
                "student_id": existing_student[0],
                "student_name": existing_student[1]
            }

        sql = """
        INSERT INTO students
        (
            name,
            email,
            gender,
            date_of_birth,
            department_id
        )
        VALUES
        (
            %s,
            %s,
            %s,
            %s,
            %s
        )
        """

        values = (
            name,
            email,
            gender,
            dob,
            department_id
        )

        cursor.execute(
            sql,
            values
        )

        connection.commit()

        student_id = cursor.lastrowid

        add_admin_log(
            username,
            f"ADD STUDENT - {name}"
        )

        return {
            "message": "Student added successfully",
            "student_id": student_id,
            "name": name,
            "email": email,
            "gender": gender,
            "date_of_birth": dob,
            "department": department[1]
        }

    except Exception as error:

        connection.rollback()

        return {
            "message": "Student could not be added",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()


# ==========================
# UPDATE STUDENT - FASTAPI
# ==========================

def update_student_api(
    username,
    student_id,
    name,
    email,
    gender,
    dob,
    department_id
):

    connection = get_connection()

    if connection is None:

        return {
            "message": "Database connection failed"
        }

    cursor = connection.cursor()

    try:

        # ==========================
        # Check Student
        # ==========================

        sql = """
        SELECT id
        FROM students
        WHERE id = %s
        """

        cursor.execute(
            sql,
            (student_id,)
        )

        existing_student = cursor.fetchone()

        if not existing_student:

            return {
                "message": "Student not found"
            }

        # ==========================
        # Validate Email
        # ==========================

        if not validate_email(email):

            return {
                "message": "Invalid email format"
            }

        # ==========================
        # Validate Date of Birth
        # ==========================

        if not validate_dob(dob):

            return {
                "message": "Invalid date of birth format. Use YYYY-MM-DD"
            }

        # ==========================
        # Check Department
        # ==========================

        sql = """
        SELECT id, name
        FROM departments
        WHERE id = %s
        """

        cursor.execute(
            sql,
            (department_id,)
        )

        department = cursor.fetchone()

        if not department:

            return {
                "message": "Invalid department ID"
            }

        # ==========================
        # Check Duplicate Email
        # ==========================

        sql = """
        SELECT id, name
        FROM students
        WHERE email = %s
        AND id != %s
        """

        cursor.execute(
            sql,
            (email, student_id)
        )

        duplicate_email = cursor.fetchone()

        if duplicate_email:

            return {
                "message": "Email already exists",
                "student_id": duplicate_email[0],
                "student_name": duplicate_email[1]
            }

        # ==========================
        # Update Student
        # ==========================

        sql = """
        UPDATE students
        SET
            name = %s,
            email = %s,
            gender = %s,
            date_of_birth = %s,
            department_id = %s
        WHERE id = %s
        """

        values = (
            name,
            email,
            gender,
            dob,
            department_id,
            student_id
        )

        cursor.execute(
            sql,
            values
        )

        connection.commit()

        # ==========================
        # Activity Log
        # ==========================

        add_admin_log(
            username,
            f"UPDATE STUDENT - ID {student_id}"
        )

        return {
            "message": "Student updated successfully",
            "student_id": student_id,
            "name": name,
            "email": email,
            "gender": gender,
            "date_of_birth": dob,
            "department": department[1]
        }

    except Exception as error:

        connection.rollback()

        return {
            "message": "Student could not be updated",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()


# ==========================
# DELETE STUDENT BY ID - FASTAPI
# ==========================

def delete_student_by_id(student_id, username):

    connection = get_connection()

    if connection is None:

        return {
            "message": "Database connection failed"
        }

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            students.id,
            students.name,
            students.email,
            students.gender,
            students.date_of_birth,
            students.created_at,
            departments.name
        FROM students
        LEFT JOIN departments
        ON students.department_id = departments.id
        WHERE students.id = %s
        """

        cursor.execute(
            sql,
            (student_id,)
        )

        student = cursor.fetchone()

        if not student:

            return {
                "message": "Student not found",
                "student_id": student_id
            }

        sql = """
        DELETE FROM students
        WHERE id = %s
        """

        cursor.execute(
            sql,
            (student_id,)
        )

        connection.commit()

        add_admin_log(
            username,
            f"DELETE STUDENT - ID {student_id}"
        )

        return {
            "message": "Student deleted successfully",
            "student_id": student[0],
            "name": student[1],
            "email": student[2],
            "gender": student[3],
            "date_of_birth": student[4],
            "department": student[6]
        }

    except Exception as error:

        connection.rollback()

        return {
            "message": "Student could not be deleted",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()


# ==========================
# DELETE STUDENT BY NAME - FASTAPI
# ==========================

def delete_student_by_name(student_name, username):

    connection = get_connection()

    if connection is None:

        return {
            "message": "Database connection failed"
        }

    cursor = connection.cursor()

    try:

        # ==========================
        # Find Student by Name
        # ==========================

        sql = """
        SELECT
            students.id,
            students.name,
            students.email,
            students.gender,
            students.date_of_birth,
            students.created_at,
            departments.name
        FROM students
        LEFT JOIN departments
        ON students.department_id = departments.id
        WHERE students.name = %s
        """

        cursor.execute(
            sql,
            (student_name,)
        )

        students = cursor.fetchall()

        if not students:

            return {
                "message": "Student not found",
                "student_name": student_name
            }

        # ==========================
        # Delete Student(s)
        # ==========================

        sql = """
        DELETE FROM students
        WHERE name = %s
        """

        cursor.execute(
            sql,
            (student_name,)
        )

        connection.commit()

        # ==========================
        # Activity Log
        # ==========================

        add_admin_log(
            username,
            f"DELETE STUDENT BY NAME - {student_name}"
        )

        # ==========================
        # Prepare Deleted Students
        # ==========================

        deleted_students = []

        for student in students:

            deleted_students.append(
                {
                    "student_id": student[0],
                    "name": student[1],
                    "email": student[2],
                    "gender": student[3],
                    "date_of_birth": student[4],
                    "department": student[6]
                }
            )

        return {
            "message": "Student(s) deleted successfully",
            "student_name": student_name,
            "deleted_count": len(deleted_students),
            "students": deleted_students
        }

    except Exception as error:

        connection.rollback()

        return {
            "message": "Student could not be deleted",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()