import os
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.request import urlopen
from urllib.error import URLError

ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"
PYTHON = sys.executable
NPM_CMD = "npm.cmd" if os.name == "nt" else "npm"

BACKEND_URL = "http://127.0.0.1:8000/health"
FRONTEND_URL = "http://127.0.0.1:5173"

procs = []


def log_stream(proc, label):
    try:
        for line in proc.stdout:
            if line:
                print(f"[{label}] {line.rstrip()}")
    except Exception:
        pass


def wait_for_url(url, timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urlopen(url, timeout=2) as response:
                if response.status < 500:
                    return True
        except URLError:
            pass
        time.sleep(1)
    return False


def is_port_in_use(port):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except OSError:
        return False


def start_backend():
    if is_port_in_use(8000):
        if wait_for_url(BACKEND_URL, timeout=10):
            print("Backend already running on http://127.0.0.1:8000")
            return None
        print("Port 8000 is occupied, but the backend is not responding. Please free the port and try again.")
        return None

    cmd = [PYTHON, "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "8000"]
    proc = subprocess.Popen(cmd, cwd=str(ROOT), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    procs.append(proc)
    threading.Thread(target=log_stream, args=(proc, "BACKEND"), daemon=True).start()
    return proc


def start_frontend():
    if is_port_in_use(5173):
        if wait_for_url(FRONTEND_URL, timeout=10):
            print("Frontend already running on http://127.0.0.1:5173")
            return None
        print("Port 5173 is occupied, but the frontend is not responding. Please free the port and try again.")
        return None

    npm_path = shutil.which(NPM_CMD)
    if not npm_path:
        raise FileNotFoundError(f"{NPM_CMD} was not found in PATH. Please install Node.js and npm.")

    cmd = [npm_path, "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"]
    proc = subprocess.Popen(cmd, cwd=str(FRONTEND_DIR), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    procs.append(proc)
    threading.Thread(target=log_stream, args=(proc, "FRONTEND"), daemon=True).start()
    return proc


def shutdown(signum, frame):
    print("\nStopping app...")
    for proc in procs:
        try:
            proc.terminate()
        except Exception:
            pass
    for proc in procs:
        try:
            proc.wait(timeout=10)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
    raise SystemExit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("Starting Student Management System...")
    start_backend()
    if not wait_for_url(BACKEND_URL, timeout=30):
        if is_port_in_use(8000):
            print("Backend port is occupied; using the running instance.")
        else:
            print("Backend did not start successfully.")
            shutdown(None, None)

    start_frontend()
    if not wait_for_url(FRONTEND_URL, timeout=30):
        if is_port_in_use(5173):
            print("Frontend port is occupied; using the running instance.")
        else:
            print("Frontend did not start successfully.")
            shutdown(None, None)

    print("\n========================================")
    print("Student Management System is running")
    print("Backend: http://127.0.0.1:8000")
    print("Frontend: http://127.0.0.1:5173")
    print("Press Ctrl+C to stop")
    print("========================================\n")

    while True:
        time.sleep(1)
