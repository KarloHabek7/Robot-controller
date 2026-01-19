import subprocess
import sys
import os
import platform
import time
import threading

# Configuration
BACKEND_DIR = "backend"
FRONTEND_DIR = "frontend"
VENV_DIR = ".venv"
REQUIREMENTS_FILE = os.path.join(BACKEND_DIR, "requirements.txt")

def is_windows():
    return platform.system().lower() == "windows"

def get_venv_python():
    if is_windows():
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    return os.path.join(VENV_DIR, "bin", "python")

def get_venv_pip():
    if is_windows():
        return os.path.join(VENV_DIR, "Scripts", "pip.exe")
    return os.path.join(VENV_DIR, "bin", "pip")

def setup_venv():
    if not os.path.exists(VENV_DIR):
        print(f"[Setup] Creating virtual environment in {VENV_DIR}...")
        subprocess.check_call([sys.executable, "-m", "venv", VENV_DIR])
    
    print("[Setup] Installing/Updating backend dependencies...")
    subprocess.check_call([get_venv_python(), "-m", "pip", "install", "-r", REQUIREMENTS_FILE])

def setup_frontend():
    print("[Setup] Installing frontend dependencies (npm)...")
    # Using shell=True for windows npm compatibility if not in path as executable
    subprocess.check_call(["npm", "install"], cwd=FRONTEND_DIR, shell=is_windows())

def run_backend():
    print("[Backend] Starting Uvicorn...")
    python_executable = get_venv_python()
    subprocess.run([python_executable, "-m", "uvicorn", "backend.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000", "--log-level", "debug"], check=False)

def run_frontend():
    print("[Frontend] Starting Vite...")
    subprocess.run(["npm", "run", "dev"], cwd=FRONTEND_DIR, shell=is_windows(), check=False)

def main():
    print("=== UR5 Controller Orchestrator ===")
    
    # 1. Setup Phase
    try:
        setup_venv()
        setup_frontend()
    except Exception as e:
        print(f"[Error] Setup failed: {e}")
        sys.exit(1)

    print("\n=== Starting Services ===\n")

    # 2. Run Phase (Parallel)
    backend_process = threading.Thread(target=run_backend)
    frontend_process = threading.Thread(target=run_frontend)

    backend_process.start()
    frontend_process.start()

    try:
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Stop] Shutting down...")
        # Threads are daemon=False by default, so they might persist. 
        # In a real production script we'd manage subprocess handles better but this is sufficient for dev.
        sys.exit(0)

if __name__ == "__main__":
    main()
