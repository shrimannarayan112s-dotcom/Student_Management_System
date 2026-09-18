from database.database import get_connection


# ==========================
# Add Admin Log
# ==========================

def add_admin_log(username, action):

    connection = get_connection()

    if connection is None:
        return False

    cursor = None

    try:

        cursor = connection.cursor()

        sql = """
        INSERT INTO admin_logs
        (username, action)
        VALUES (%s, %s)
        """

        cursor.execute(
            sql,
            (username, action)
        )

        connection.commit()

        return True

    except Exception as error:

        if connection:
            connection.rollback()

        print("\n❌ Admin Log Error!")
        print("Unable to save activity log.")
        print("Error:", error)

        return False

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ==========================
# Get All Logs
# ==========================

def view_admin_logs():

    connection = get_connection()

    if connection is None:
        return []

    cursor = None

    try:

        cursor = connection.cursor()

        sql = """
        SELECT
            id,
            username,
            action,
            created_at
        FROM admin_logs
        ORDER BY id DESC
        """

        cursor.execute(sql)

        logs = cursor.fetchall()

        return logs

    except Exception as error:

        print("\n❌ Admin Log Error!")
        print("Unable to load activity logs.")
        print("Error:", error)

        return []

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ==========================
# View My Logs
# ==========================

def view_my_logs(username):

    connection = get_connection()

    if connection is None:
        return []

    cursor = None

    try:

        cursor = connection.cursor()

        sql = """
        SELECT
            id,
            username,
            action,
            created_at
        FROM admin_logs
        WHERE LOWER(username) = LOWER(%s)
        ORDER BY id DESC
        """

        cursor.execute(
            sql,
            (username,)
        )

        logs = cursor.fetchall()

        return logs

    except Exception as error:

        print("\n❌ Admin Log Error!")
        print("Unable to load your activity logs.")
        print("Error:", error)

        return []

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ==========================
# Search Logs by Action
# ==========================

def search_logs_by_action(action):

    connection = get_connection()

    if connection is None:
        return []

    cursor = None

    try:

        cursor = connection.cursor()

        sql = """
        SELECT
            id,
            username,
            action,
            created_at
        FROM admin_logs
        WHERE LOWER(action) LIKE LOWER(%s)
        ORDER BY id DESC
        """

        search_action = "%" + action + "%"

        cursor.execute(
            sql,
            (search_action,)
        )

        logs = cursor.fetchall()

        return logs

    except Exception as error:

        print("\n❌ Admin Log Error!")
        print("Unable to search activity logs.")
        print("Error:", error)

        return []

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ==========================
# Search Logs by Date
# ==========================

def search_logs_by_date(date):

    connection = get_connection()

    if connection is None:
        return []

    cursor = None

    try:

        cursor = connection.cursor()

        sql = """
        SELECT
            id,
            username,
            action,
            created_at
        FROM admin_logs
        WHERE DATE(created_at) = %s
        ORDER BY id DESC
        """

        cursor.execute(
            sql,
            (date,)
        )

        logs = cursor.fetchall()

        return logs

    except Exception as error:

        print("\n❌ Admin Log Error!")
        print("Unable to search logs by date.")
        print("Error:", error)

        return []

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ==========================
# Display Logs
# ==========================

def display_logs(logs):

    print("\n" + "=" * 80)
    print("                         ADMIN ACTIVITY LOGS")
    print("=" * 80)

    print(
        f"{'ID':<5}"
        f"{'USERNAME':<20}"
        f"{'ACTION':<30}"
        f"DATE / TIME"
    )

    print("-" * 80)

    if not logs:

        print("No activity logs found.")

    else:

        for log in logs:

            log_id = log[0]
            username = log[1]
            action = log[2]
            created_at = log[3]

            print(
                f"{log_id:<5}"
                f"{username:<20}"
                f"{action:<30}"
                f"{created_at}"
            )

    print("=" * 80)


# ==========================
# Activity Log Menu
# ==========================

def activity_log_menu(username):

    while True:

        print("\n" + "=" * 50)
        print("           ACTIVITY LOGS")
        print("=" * 50)

        print("1. View All Logs")
        print("2. View My Logs")
        print("3. Search Logs by Action")
        print("4. Search Logs by Date")
        print("5. Back")

        print("=" * 50)

        choice = input(
            "Enter your choice: "
        ).strip()

        # ==========================
        # 1. View All Logs
        # ==========================

        if choice == "1":

            logs = view_admin_logs()

            display_logs(logs)

        # ==========================
        # 2. View My Logs
        # ==========================

        elif choice == "2":

            logs = view_my_logs(username)

            display_logs(logs)

        # ==========================
        # 3. Search by Action
        # ==========================

        elif choice == "3":

            action = input(
                "Enter action to search: "
            ).strip()

            if action == "":

                print("\n❌ Action cannot be empty!")

                continue

            logs = search_logs_by_action(action)

            display_logs(logs)

        # ==========================
        # 4. Search by Date
        # ==========================

        elif choice == "4":

            date = input(
                "Enter date (YYYY-MM-DD): "
            ).strip()

            if date == "":

                print("\n❌ Date cannot be empty!")

                continue

            logs = search_logs_by_date(date)

            display_logs(logs)

        # ==========================
        # 5. Back
        # ==========================

        elif choice == "5":

            break

        # ==========================
        # Invalid Choice
        # ==========================

        else:

            print("\n❌ Invalid Choice!")

            print(
                "Please select a number from 1 to 5."
            )