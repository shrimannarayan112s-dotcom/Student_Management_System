import bcrypt
from database.database import get_connection


def create_admin():
    print("\n===== CREATE ADMIN =====")

    username = input("Enter admin username: ").strip()
    password = input("Enter admin password: ").strip()

    if not username or not password:
        print("[ERROR] Username and password cannot be empty.")
        return

    # Hash password
    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    connection = get_connection()

    if connection is None:
        print("[ERROR] Database connection failed.")
        return

    try:
        cursor = connection.cursor()

        sql = """
        INSERT INTO admins (username, password)
        VALUES (%s, %s)
        """

        cursor.execute(sql, (username, hashed_password))
        connection.commit()

        print("\n[OK] Admin created successfully!")
        print("Username:", username)

    except Exception as e:
        connection.rollback()
        print("[ERROR] Error:", e)

    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    create_admin()