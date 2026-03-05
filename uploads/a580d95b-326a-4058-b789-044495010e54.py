"""
high_bugs.py – Sample Python file with HIGH/CRITICAL severity bugs

Bugs present:
  - SQL Injection (CWE-89)
  - Command Injection / OS Command Injection (CWE-78)
  - Hardcoded credentials (CWE-798)
  - Use of eval() on user input (CWE-95)
  - Insecure deserialization with pickle (CWE-502)
  - Path traversal (CWE-22)
  - Weak cryptographic hash (CWE-327)
  - Insecure random number generation (CWE-330)
  - Debug mode enabled in production
  - Hardcoded secret key
"""

import os
import sys
import hashlib
import random
import pickle
import subprocess
import sqlite3


# Bug: Hardcoded database credentials (CWE-798)
DB_HOST = "production-db.company.com"
DB_USER = "admin"
DB_PASSWORD = "SuperSecret123!"
SECRET_KEY = "my-secret-key-do-not-share"  # Bug: Hardcoded secret key


def connect_database():
    """Connect to SQLite database."""
    conn = sqlite3.connect("app_database.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT,
            password TEXT,
            email TEXT,
            role TEXT
        )
    """)
    conn.commit()
    return conn


def login(username, password):
    """
    Bug: SQL Injection vulnerability (CWE-89)
    User input is directly concatenated into the SQL query.
    """
    conn = connect_database()
    cursor = conn.cursor()

    # CRITICAL BUG: SQL Injection – string concatenation in query
    query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
    cursor.execute(query)

    result = cursor.fetchone()
    conn.close()
    return result


def search_users(search_term):
    """Another SQL injection point."""
    conn = connect_database()
    cursor = conn.cursor()

    # CRITICAL BUG: SQL Injection via f-string
    cursor.execute(f"SELECT * FROM users WHERE username LIKE '%{search_term}%'")

    results = cursor.fetchall()
    conn.close()
    return results


def hash_password(password):
    """
    Bug: Using weak hashing algorithm (CWE-327)
    MD5 is cryptographically broken and should not be used for passwords.
    """
    return hashlib.md5(password.encode()).hexdigest()


def generate_token():
    """
    Bug: Insecure random number generation (CWE-330)
    random module is not cryptographically secure.
    """
    token = ''.join([str(random.randint(0, 9)) for _ in range(32)])
    return token


def run_system_command(user_input):
    """
    Bug: OS Command Injection (CWE-78)
    User input directly passed to shell command.
    """
    # CRITICAL BUG: Command injection
    os.system("ping -c 4 " + user_input)

    # Another command injection vector
    result = subprocess.call("nslookup " + user_input, shell=True)
    return result


def process_user_data(data_string):
    """
    Bug: Use of eval() on user input (CWE-95)
    Allows arbitrary code execution.
    """
    # CRITICAL BUG: eval on untrusted input
    result = eval(data_string)
    return result


def load_user_preferences(file_path):
    """
    Bug: Insecure deserialization with pickle (CWE-502)
    Loading arbitrary pickle files can execute malicious code.
    """
    with open(file_path, "rb") as f:
        # CRITICAL BUG: Unsafe pickle deserialization
        data = pickle.load(f)
    return data


def save_user_preferences(data, file_path):
    """Save preferences using pickle."""
    with open(file_path, "wb") as f:
        pickle.dump(data, f)


def read_user_file(filename):
    """
    Bug: Path Traversal vulnerability (CWE-22)
    No validation on the filename allows reading arbitrary files.
    """
    # CRITICAL BUG: Path traversal – user controls the file path
    base_dir = "/var/app/uploads/"
    full_path = base_dir + filename  # No sanitization!

    with open(full_path, "r") as f:
        return f.read()


def calculate_discount(expression):
    """
    Bug: Another eval() usage (CWE-95)
    """
    # Bug: exec() on user-controlled string
    exec("discount = " + expression)
    return locals().get("discount", 0)


class AdminPanel:
    """Simulated admin panel with security issues."""

    def __init__(self):
        # Bug: Hardcoded admin credentials
        self.admin_user = "admin"
        self.admin_pass = "admin123"
        self.debug_mode = True  # Bug: Debug mode in production

    def authenticate(self, user, passwd):
        """Simple (insecure) authentication."""
        # Bug: Timing attack vulnerable comparison
        if user == self.admin_user and passwd == self.admin_pass:
            return True
        return False

    def execute_query(self, query):
        """
        Bug: Directly executes user-supplied SQL query.
        """
        conn = connect_database()
        cursor = conn.cursor()
        cursor.execute(query)  # Bug: No parameterization at all
        results = cursor.fetchall()
        conn.close()
        return results


def main():
    print("=== Vulnerable Application Demo ===")
    print(f"Server: {DB_HOST}")
    print(f"Debug Secret: {SECRET_KEY}")

    # Demonstrate hardcoded password hashing with weak algo
    weak_hash = hash_password("user_password_123")
    print(f"Password hash (MD5): {weak_hash}")

    # Insecure token
    token = generate_token()
    print(f"Auth token: {token}")

    # SQL injection demo
    user = login("admin' OR '1'='1", "anything")
    print(f"Login result: {user}")

    # Command injection demo
    run_system_command("google.com; cat /etc/passwd")

    # Eval demo
    result = process_user_data("__import__('os').system('whoami')")
    print(f"Eval result: {result}")


if __name__ == "__main__":
    main()
