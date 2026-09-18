import re
import bcrypt

from database.database import get_connection
from services.admin_log_service import add_admin_log


# ============================================================
# PASSWORD VALIDATION
# ============================================================

def validate_password(password):
    if len(password) < 8:
        print("\n[ERROR] Password must contain at least 8 characters.")
        return False

    if not re.search(r"[A-Z]", password):
        print("\n[ERROR] Password must contain at least one uppercase letter.")
        return False

    if not re.search(r"[a-z]", password):
        print("\n[ERROR] Password must contain at least one lowercase letter.")
        return False

    if not re.search(r"[0-9]", password):
        print("\n[ERROR] Password must contain at least one number.")
        return False

    return True


# ============================================================
# ADMIN LOGIN
# ============================================================

def authenticate_admin(username, password):

    connection = get_connection()

    if connection is None:
        return None

    cursor = connection.cursor()

    try:
        sql = """
        SELECT id, username, password, role, status
        FROM admins
        WHERE username = %s
        """

        cursor.execute(sql, (username,))
        admin = cursor.fetchone()

        if not admin:
            return None

        stored_password = admin[2]
        status = admin[4]

        if status != "Active":
            print("\n[ERROR] Admin account is inactive.")
            print("Please contact the administrator.")
            return None

        if bcrypt.checkpw(
            password.encode("utf-8"),
            stored_password.encode("utf-8")
        ):
            return {
                "id": admin[0],
                "username": admin[1],
                "role": admin[3],
                "account_status": admin[4]
            }

        return None

    except Exception as error:

        print("\n[ERROR] Database Error!")
        print("Unable to login.")
        print("Error:", error)

        return None

    finally:

        cursor.close()
        connection.close()


def admin_login(username, password):
    return authenticate_admin(username, password) is not None


def has_admin_role(username, role=None):

    connection = get_connection()

    if connection is None:
        return False

    cursor = connection.cursor()

    try:

        cursor.execute(
            "SELECT role, status FROM admins WHERE username = %s",
            (username,)
        )
        admin = cursor.fetchone()

        if not admin or admin[1] != "Active":
            return False

        return role is None or admin[0] == role

    except Exception as error:

        print("\n[ERROR] Database Error!")
        print("Unable to verify admin permissions.")
        print("Error:", error)
        return False

    finally:

        cursor.close()
        connection.close()


# ============================================================
# CHANGE ADMIN PASSWORD - CLI
# ============================================================

def change_admin_password(username):

    print("\n" + "=" * 50)
    print("        CHANGE ADMIN PASSWORD")
    print("=" * 50)

    current_password = input("Enter current password: ")

    new_password = input("Enter new password: ")

    confirm_password = input("Confirm new password: ")

    if not current_password:

        print("\n[ERROR] Current password cannot be empty.")

        return False

    if not new_password:

        print("\n[ERROR] New password cannot be empty.")

        return False

    if new_password != confirm_password:

        print("\n[ERROR] New passwords do not match.")

        return False

    if not validate_password(new_password):

        return False

    connection = get_connection()

    if connection is None:

        return False

    cursor = connection.cursor()

    try:

        sql = """
        SELECT password
        FROM admins
        WHERE username = %s
        """

        cursor.execute(sql, (username,))

        admin = cursor.fetchone()

        if not admin:

            print("\n❌ Admin not found.")

            return False

        stored_password = admin[0]

        if not bcrypt.checkpw(
            current_password.encode("utf-8"),
            stored_password.encode("utf-8")
        ):

            print("\n[ERROR] Current password is incorrect.")

            return False

        hashed_password = bcrypt.hashpw(
            new_password.encode("utf-8"),
            bcrypt.gensalt()
        )

        sql = """
        UPDATE admins
        SET password = %s
        WHERE username = %s
        """

        cursor.execute(
            sql,
            (
                hashed_password.decode("utf-8"),
                username
            )
        )

        connection.commit()

        print("\n[OK] Password changed successfully!")

        return True

    except Exception as error:

        connection.rollback()

        print("\n[ERROR] Database Error!")
        print("Password could not be changed.")
        print("Error:", error)

        return False

    finally:

        cursor.close()
        connection.close()


# ============================================================
# CHANGE ADMIN PASSWORD - API
# ============================================================

def change_admin_password_api(
    username,
    current_password,
    new_password,
    confirm_password
):

    # --------------------------------------------------------
    # EMPTY PASSWORD CHECKS
    # --------------------------------------------------------

    if not current_password:

        return {
            "status": "error",
            "message": "Current password cannot be empty."
        }

    if not new_password:

        return {
            "status": "error",
            "message": "New password cannot be empty."
        }

    if not confirm_password:

        return {
            "status": "error",
            "message": "Confirm password cannot be empty."
        }

    # --------------------------------------------------------
    # CONFIRM PASSWORD
    # --------------------------------------------------------

    if new_password != confirm_password:

        return {
            "status": "error",
            "message": "New passwords do not match."
        }

    # --------------------------------------------------------
    # PASSWORD VALIDATION
    # --------------------------------------------------------

    if len(new_password) < 8:

        return {
            "status": "error",
            "message": "Password must contain at least 8 characters."
        }

    if not re.search(r"[A-Z]", new_password):

        return {
            "status": "error",
            "message": "Password must contain at least one uppercase letter."
        }

    if not re.search(r"[a-z]", new_password):

        return {
            "status": "error",
            "message": "Password must contain at least one lowercase letter."
        }

    if not re.search(r"[0-9]", new_password):

        return {
            "status": "error",
            "message": "Password must contain at least one number."
        }

    # --------------------------------------------------------
    # DATABASE CONNECTION
    # --------------------------------------------------------

    connection = get_connection()

    if connection is None:

        return {
            "status": "error",
            "message": "Database connection failed."
        }

    cursor = connection.cursor()

    try:

        # ----------------------------------------------------
        # GET ADMIN PASSWORD
        # ----------------------------------------------------

        sql = """
        SELECT password
        FROM admins
        WHERE username = %s
        """

        cursor.execute(sql, (username,))

        admin = cursor.fetchone()

        if not admin:

            return {
                "status": "error",
                "message": "Admin not found."
            }

        stored_password = admin[0]

        # ----------------------------------------------------
        # CHECK CURRENT PASSWORD
        # ----------------------------------------------------

        if not bcrypt.checkpw(
            current_password.encode("utf-8"),
            stored_password.encode("utf-8")
        ):

            return {
                "status": "error",
                "message": "Current password is incorrect."
            }

        # ----------------------------------------------------
        # HASH NEW PASSWORD
        # ----------------------------------------------------

        hashed_password = bcrypt.hashpw(
            new_password.encode("utf-8"),
            bcrypt.gensalt()
        )

        # ----------------------------------------------------
        # UPDATE PASSWORD
        # ----------------------------------------------------

        sql = """
        UPDATE admins
        SET password = %s
        WHERE username = %s
        """

        cursor.execute(
            sql,
            (
                hashed_password.decode("utf-8"),
                username
            )
        )

        connection.commit()

        return {
            "status": "success",
            "message": "Password changed successfully! 🔐"
        }

    except Exception as error:

        connection.rollback()

        return {
            "status": "error",
            "message": "Password could not be changed.",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ADMIN PROFILE
# ============================================================

def get_admin_profile(username):

    connection = get_connection()

    if connection is None:
        return None

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            id,
            username,
            role,
            status,
            created_at
        FROM admins
        WHERE username = %s
        """

        cursor.execute(sql, (username,))

        admin = cursor.fetchone()

        if not admin:

            print("\n[ERROR] Admin profile not found.")

            return None

        print("\n" + "=" * 50)
        print("             ADMIN PROFILE")
        print("=" * 50)

        print(f"ID       : {admin[0]}")
        print(f"Username : {admin[1]}")
        print(f"Role     : {admin[2]}")
        print(f"Status   : {admin[3]}")
        print(f"Created  : {admin[4]}")

        print("=" * 50)

        return admin

    except Exception as error:

        print("\n[ERROR] Database Error!")
        print("Unable to load admin profile.")
        print("Error:", error)

        return None

    finally:

        cursor.close()
        connection.close()


# ============================================================
# ADMIN MANAGEMENT - API
# ============================================================

def _is_active_administrator(cursor, username):

    sql = """
    SELECT id
    FROM admins
    WHERE username = %s
      AND role = %s
      AND status = %s
    """

    cursor.execute(
        sql,
        (username, "Administrator", "Active")
    )

    return cursor.fetchone() is not None


def get_admins_api(username):

    connection = get_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Database connection failed."
        }

    cursor = connection.cursor()

    try:

        if not _is_active_administrator(cursor, username):
            return {
                "status": "error",
                "message": "Only an active Administrator can manage admins."
            }

        sql = """
        SELECT id, username, role, status, created_at
        FROM admins
        ORDER BY id
        """

        cursor.execute(sql)
        admins = cursor.fetchall()

        add_admin_log(username, "VIEW ADMINS")

        return {
            "status": "success",
            "message": "Admins retrieved successfully",
            "count": len(admins),
            "admins": [
                {
                    "id": admin[0],
                    "username": admin[1],
                    "role": admin[2],
                    "status": admin[3],
                    "created_at": str(admin[4])
                }
                for admin in admins
            ]
        }

    except Exception as error:

        return {
            "status": "error",
            "message": "Unable to retrieve administrators.",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()


def create_admin_api(
    username,
    new_username,
    password,
    confirm_password,
    role
):

    new_username = new_username.strip()
    role = role.strip()

    if not new_username:
        return {
            "status": "error",
            "message": "Username cannot be empty."
        }

    if password != confirm_password:
        return {
            "status": "error",
            "message": "Passwords do not match."
        }

    if not validate_password(password):
        return {
            "status": "error",
            "message": "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number."
        }

    if role not in ("Administrator", "Staff"):
        return {
            "status": "error",
            "message": "Role must be Administrator or Staff."
        }

    connection = get_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Database connection failed."
        }

    cursor = connection.cursor()

    try:

        if not _is_active_administrator(cursor, username):
            return {
                "status": "error",
                "message": "Only an active Administrator can manage admins."
            }

        cursor.execute(
            "SELECT id FROM admins WHERE username = %s",
            (new_username,)
        )

        if cursor.fetchone():
            return {
                "status": "error",
                "message": "Username already exists."
            }

        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        sql = """
        INSERT INTO admins (username, password, role, status)
        VALUES (%s, %s, %s, %s)
        """

        cursor.execute(
            sql,
            (new_username, hashed_password, role, "Active")
        )

        connection.commit()
        add_admin_log(username, f"CREATE ADMIN - {new_username}")

        return {
            "status": "success",
            "message": "Admin created successfully",
            "admin": {
                "id": cursor.lastrowid,
                "username": new_username,
                "role": role,
                "status": "Active"
            }
        }

    except Exception as error:

        connection.rollback()

        return {
            "status": "error",
            "message": "Admin could not be created.",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()


def update_admin_status_api(username, admin_id):

    connection = get_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Database connection failed."
        }

    cursor = connection.cursor()

    try:

        if not _is_active_administrator(cursor, username):
            return {
                "status": "error",
                "message": "Only an active Administrator can manage admins."
            }

        cursor.execute(
            "SELECT id, username, role, status FROM admins WHERE id = %s",
            (admin_id,)
        )
        admin = cursor.fetchone()

        if not admin:
            return {
                "status": "error",
                "message": "Admin account not found."
            }

        if admin[1].lower() == username.lower():
            return {
                "status": "error",
                "message": "You cannot change your own account status."
            }

        new_status = "Inactive" if admin[3] == "Active" else "Active"

        if new_status == "Inactive" and admin[2] == "Administrator":
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM admins
                WHERE role = %s AND status = %s AND id <> %s
                """,
                ("Administrator", "Active", admin_id)
            )

            if cursor.fetchone()[0] == 0:
                return {
                    "status": "error",
                    "message": "The last active Administrator cannot be deactivated."
                }

        cursor.execute(
            "UPDATE admins SET status = %s WHERE id = %s",
            (new_status, admin_id)
        )
        connection.commit()
        add_admin_log(username, f"CHANGE ADMIN STATUS - {admin[1]} - {new_status}")

        return {
            "status": "success",
            "message": f"Admin status changed to {new_status}.",
            "admin_id": admin_id,
            "account_status": new_status
        }

    except Exception as error:

        connection.rollback()

        return {
            "status": "error",
            "message": "Unable to change admin status.",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()


def update_admin_role_api(username, admin_id, role):

    role = role.strip()

    if role not in ("Administrator", "Staff"):
        return {
            "status": "error",
            "message": "Role must be Administrator or Staff."
        }

    connection = get_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Database connection failed."
        }

    cursor = connection.cursor()

    try:

        if not _is_active_administrator(cursor, username):
            return {
                "status": "error",
                "message": "Only an active Administrator can manage admins."
            }

        cursor.execute(
            "SELECT id, username, role, status FROM admins WHERE id = %s",
            (admin_id,)
        )
        admin = cursor.fetchone()

        if not admin:
            return {
                "status": "error",
                "message": "Admin account not found."
            }

        if admin[1].lower() == username.lower():
            return {
                "status": "error",
                "message": "You cannot change your own account role."
            }

        if role == "Staff" and admin[2] == "Administrator" and admin[3] == "Active":
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM admins
                WHERE role = %s AND status = %s AND id <> %s
                """,
                ("Administrator", "Active", admin_id)
            )

            if cursor.fetchone()[0] == 0:
                return {
                    "status": "error",
                    "message": "The last active Administrator cannot be demoted."
                }

        cursor.execute(
            "UPDATE admins SET role = %s WHERE id = %s",
            (role, admin_id)
        )
        connection.commit()
        add_admin_log(username, f"CHANGE ADMIN ROLE - {admin[1]} - {role}")

        return {
            "status": "success",
            "message": f"Admin role changed to {role}.",
            "admin_id": admin_id,
            "role": role
        }

    except Exception as error:

        connection.rollback()

        return {
            "status": "error",
            "message": "Unable to change admin role.",
            "error": str(error)
        }

    finally:

        cursor.close()
        connection.close()


# ============================================================
# VIEW ADMINS
# ============================================================

def view_admins():

    connection = get_connection()

    if connection is None:
        return

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            id,
            username,
            role,
            status,
            created_at
        FROM admins
        ORDER BY id
        """

        cursor.execute(sql)

        admins = cursor.fetchall()

        print("\n" + "=" * 85)
        print("                         ADMIN LIST")
        print("=" * 85)

        print(
            f"{'ID':<5}"
            f"{'USERNAME':<25}"
            f"{'ROLE':<25}"
            f"{'STATUS':<15}"
            f"{'CREATED AT'}"
        )

        print("-" * 85)

        if not admins:

            print("No administrators found.")

        else:

            for admin in admins:

                print(
                    f"{admin[0]:<5}"
                    f"{admin[1]:<25}"
                    f"{admin[2]:<25}"
                    f"{admin[3]:<15}"
                    f"{admin[4]}"
                )

        print("=" * 85)

    except Exception as error:

        print("\n❌ Database Error!")
        print("Unable to load administrators.")
        print("Error:", error)

    finally:

        cursor.close()
        connection.close()


# ============================================================
# ADD ADMIN
# ============================================================

def add_admin():

    print("\n" + "=" * 50)
    print("             ADD NEW ADMIN")
    print("=" * 50)

    username = input("Enter new admin username: ").strip()

    if not username:

        print("\n❌ Username cannot be empty.")

        return False

    password = input("Enter admin password: ")

    confirm_password = input("Confirm admin password: ")

    if password != confirm_password:

        print("\n❌ Passwords do not match.")

        return False

    if not validate_password(password):

        return False

    connection = get_connection()

    if connection is None:
        return False

    cursor = connection.cursor()

    try:

        sql = """
        SELECT id
        FROM admins
        WHERE username = %s
        """

        cursor.execute(sql, (username,))

        existing_admin = cursor.fetchone()

        if existing_admin:

            print("\n❌ Username already exists.")

            return False

        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        )

        sql = """
        INSERT INTO admins
        (
            username,
            password,
            role,
            status
        )
        VALUES
        (
            %s,
            %s,
            %s,
            %s
        )
        """

        cursor.execute(
            sql,
            (
                username,
                hashed_password.decode("utf-8"),
                "Administrator",
                "Active"
            )
        )

        connection.commit()

        print("\n✅ Admin created successfully!")

        print(f"Username : {username}")
        print("Role     : Administrator")
        print("Status   : Active")

        return True

    except Exception as error:

        connection.rollback()

        print("\n❌ Database Error!")
        print("Admin could not be created.")
        print("Error:", error)

        return False

    finally:

        cursor.close()
        connection.close()


# ============================================================
# CHANGE ADMIN STATUS
# ============================================================

def change_admin_status():

    print("\n" + "=" * 50)
    print("          CHANGE ADMIN STATUS")
    print("=" * 50)

    admin_id = input("Enter Admin ID: ").strip()

    connection = get_connection()

    if connection is None:
        return False

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            id,
            username,
            status
        FROM admins
        WHERE id = %s
        """

        cursor.execute(sql, (admin_id,))

        admin = cursor.fetchone()

        if not admin:

            print("\n❌ Admin not found.")

            return False

        print(f"\nUsername : {admin[1]}")
        print(f"Current Status : {admin[2]}")

        if admin[2] == "Active":

            new_status = "Inactive"

        else:

            new_status = "Active"

        confirmation = input(
            f"\nChange status to {new_status}? (y/n): "
        ).strip().lower()

        if confirmation not in ("y", "yes"):

            print("\n❌ Status change cancelled.")

            return False

        sql = """
        UPDATE admins
        SET status = %s
        WHERE id = %s
        """

        cursor.execute(
            sql,
            (
                new_status,
                admin_id
            )
        )

        connection.commit()

        print(
            f"\n✅ Admin status changed to {new_status}."
        )

        return True

    except Exception as error:

        connection.rollback()

        print("\n❌ Database Error!")
        print("Unable to change admin status.")
        print("Error:", error)

        return False

    finally:

        cursor.close()
        connection.close()


# ============================================================
# DELETE ADMIN
# ============================================================

def delete_admin(current_username):

    print("\n" + "=" * 50)
    print("             DELETE ADMIN")
    print("=" * 50)

    admin_id = input("Enter Admin ID to delete: ").strip()

    connection = get_connection()

    if connection is None:
        return False

    cursor = connection.cursor()

    try:

        sql = """
        SELECT
            id,
            username,
            role,
            status
        FROM admins
        WHERE id = %s
        """

        cursor.execute(sql, (admin_id,))

        admin = cursor.fetchone()

        if not admin:

            print("\n❌ Admin not found.")

            return False

        print("\n========== Admin Details ==========")

        print(f"ID       : {admin[0]}")
        print(f"Username : {admin[1]}")
        print(f"Role     : {admin[2]}")
        print(f"Status   : {admin[3]}")

        if admin[1].lower() == current_username.lower():

            print("\n❌ You cannot delete your own admin account.")

            return False

        confirmation = input(
            "\nAre you sure you want to delete this admin? (y/n): "
        ).strip().lower()

        if confirmation not in ("y", "yes"):

            print("\n❌ Delete cancelled.")

            return False

        sql = """
        DELETE FROM admins
        WHERE id = %s
        """

        cursor.execute(sql, (admin_id,))

        connection.commit()

        print("\n✅ Admin deleted successfully!")

        return True

    except Exception as error:

        connection.rollback()

        print("\n❌ Database Error!")
        print("Admin could not be deleted.")
        print("Error:", error)

        return False

    finally:

        cursor.close()
        connection.close()


# ============================================================
# ADMIN ACCOUNT MENU
# ============================================================

def admin_account_menu(current_username):

    while True:

        print("\n" + "=" * 50)
        print("        ADMIN ACCOUNT MANAGEMENT")
        print("=" * 50)

        print("1. View Admins")
        print("2. Add Admin")
        print("3. Change Admin Status")
        print("4. Delete Admin")
        print("5. Back")

        print("=" * 50)

        choice = input("Enter your choice: ").strip()

        if choice == "1":

            view_admins()

        elif choice == "2":

            add_admin()

        elif choice == "3":

            change_admin_status()

        elif choice == "4":

            delete_admin(current_username)

        elif choice == "5":

            break

        else:

            print("\n❌ Invalid Choice!")
            print("Please select 1 to 5.")