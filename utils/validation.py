import re
from datetime import datetime


# ==========================
# Validate Email
# ==========================

def validate_email(email):

    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'

    return re.match(pattern, email) is not None


# ==========================
# Validate Mobile Number
# ==========================

def validate_mobile(number):

    return number.isdigit() and len(number) == 10


# ==========================
# Validate Date of Birth
# ==========================

def validate_dob(dob):

    try:
        datetime.strptime(dob, "%Y-%m-%d")
        return True

    except ValueError:
        return False