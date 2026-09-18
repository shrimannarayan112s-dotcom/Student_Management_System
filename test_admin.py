from services.admin_service import admin_login


print("=" * 50)
print("           ADMIN LOGIN TEST")
print("=" * 50)

username = input("Enter admin username: ").strip()
password = input("Enter admin password: ")

if admin_login(username, password):

    print("\n[OK] Admin Login Successful!")

else:

    print("\n[ERROR] Invalid Username or Password")