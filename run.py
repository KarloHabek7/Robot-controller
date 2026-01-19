import subprocess
import sys
import os
import platform
import time
import threading
import webbrowser

# Configuration
BACKEND_DIR = "backend"
FRONTEND_DIR = "frontend"
VENV_DIR = ".venv"
REQUIREMENTS_FILE = os.path.join(BACKEND_DIR, "requirements.txt")
NGROK_AUTHTOKEN = os.environ.get("NGROK_AUTHTOKEN")

# Try to load from .env file if NGROK_AUTHTOKEN is not in environment
if not NGROK_AUTHTOKEN and os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            if line.startswith("NGROK_AUTHTOKEN="):
                NGROK_AUTHTOKEN = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if NGROK_AUTHTOKEN:
    print(f"[Config] NGROK_AUTHTOKEN loaded (starts with {NGROK_AUTHTOKEN[:5]}...)")
else:
    print("[Config] No NGROK_AUTHTOKEN found in environment or .env")

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

def setup_ngrok():
    global USE_NGROK
    if not NGROK_AUTHTOKEN:
        print("[ngrok] No NGROK_AUTHTOKEN found. Skipping trusted tunnels (will use local IP).")
        # Ensure .env.local is cleaned up if no ngrok
        env_local = os.path.join(FRONTEND_DIR, ".env.local")
        if os.path.exists(env_local):
            os.remove(env_local)
        return None, None

    try:
        from pyngrok import ngrok
        print("[ngrok] Setting up tunnels...")
        ngrok.set_auth_token(NGROK_AUTHTOKEN)
        
        # Backend tunnel
        backend_tunnel = ngrok.connect("127.0.0.1:8000", "http")
        print(f"[ngrok] Backend tunnel: {backend_tunnel.public_url}")
        
        # Frontend tunnel
        frontend_tunnel = ngrok.connect("127.0.0.1:8080", "http")
        print(f"[ngrok] Frontend tunnel: {frontend_tunnel.public_url}")
        
        # Write backend URL to frontend .env.local
        with open(os.path.join(FRONTEND_DIR, ".env.local"), "w") as f:
            f.write(f"VITE_API_BASE_URL={backend_tunnel.public_url}\n")
        
        USE_NGROK = True
        return backend_tunnel, frontend_tunnel
    except ImportError:
        print("[ngrok] pyngrok not installed yet. Skipping setup.")
        USE_NGROK = False
        return None, None
    except Exception as e:
        print(f"[ngrok] Error setting up tunnels: {e}")
        USE_NGROK = False
        return None, None

USE_NGROK = False

def run_backend():
    print(f"[Backend] Starting Uvicorn {'(HTTP for ngrok)' if USE_NGROK else 'with SSL'}...")
    python_executable = get_venv_python()
    cmd = [
        python_executable, "-m", "uvicorn", "backend.main:app", 
        "--reload", 
        "--host", "127.0.0.1" if USE_NGROK else "0.0.0.0", 
        "--port", "8000",
        "--log-level", "debug"
    ]
    if not USE_NGROK:
        cmd.extend(["--ssl-keyfile", "certs/key.pem", "--ssl-certfile", "certs/cert.pem"])
    
    subprocess.run(cmd, check=False)

def run_frontend():
    print(f"[Frontend] Starting Vite {'(HTTP for ngrok)' if USE_NGROK else 'with HTTPS'}...")
    # Passing --host to vite via npm run dev -- --host
    cmd = ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
    if USE_NGROK:
        # Actually, if vite.config.ts has https, we tell Vite via an env var.
        os.environ["VITE_NO_HTTPS"] = "true"

    subprocess.run(cmd, cwd=FRONTEND_DIR, shell=is_windows(), check=False)

def main():
    print("=== UR5 Controller Orchestrator ===")
    
    # 1. Setup Phase
    tunnels = (None, None)
    try:
        setup_venv()
        setup_frontend()
        tunnels = setup_ngrok()
    except Exception as e:
        print(f"[Error] Setup failed: {e}")
        sys.exit(1)

    print("\n=== Starting Services ===\n")

    # 2. Run Phase (Parallel)
    backend_process = threading.Thread(target=run_backend)
    frontend_process = threading.Thread(target=run_frontend)

    backend_process.start()
    frontend_process.start()

    # 3. Open Browser Phase
    backend_tunnel, frontend_tunnel = tunnels
    target_url = "https://localhost:8080" # Default
    
    if frontend_tunnel:
        target_url = frontend_tunnel.public_url
    else:
        # Fallback to local IP
        import socket
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            target_url = f"https://{local_ip}:8080"
        except:
            pass

    print(f"\n[Ready] Application will be available at: {target_url}")
    print("[Ready] Attempting to open browser automatically in 3 seconds...")
    
    def open_browser():
        time.sleep(3)
        print(f"[Ready] Opening {target_url}")
        webbrowser.open(target_url)

    threading.Thread(target=open_browser, daemon=True).start()

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
