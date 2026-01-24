import subprocess
import sys
import os
import platform
import time
import threading
import webbrowser
import signal

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
processes = []

def start_backend():
    print(f"[Backend] Starting Uvicorn (HTTP)...")
    python_executable = get_venv_python()
    cmd = [
        python_executable, "-m", "uvicorn", "backend.main:app", 
        "--reload", 
        "--host", "127.0.0.1" if USE_NGROK else "0.0.0.0", 
        "--port", "8000",
        "--log-level", "info"
    ]
    # Removed SSL for local dev to prevent mixed content/handshake timeouts
    # if not USE_NGROK:
    #     cmd.extend(["--ssl-keyfile", "certs/key.pem", "--ssl-certfile", "certs/cert.pem"])
    
    # Use Popen to keep track of the process
    p = subprocess.Popen(cmd)
    processes.append(p)
    return p

def start_frontend():
    print(f"[Frontend] Starting Vite (HTTP)...")
    # Passing --host to vite via npm run dev -- --host
    cmd = ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
    
    env = os.environ.copy()
    if USE_NGROK:
        # Actually, if vite.config.ts has https, we tell Vite via an env var.
        env["VITE_NO_HTTPS"] = "true"

    # Use Popen to keep track of the process
    p = subprocess.Popen(cmd, cwd=FRONTEND_DIR, shell=is_windows(), env=env)
    processes.append(p)
    return p

def get_local_ips():
    import socket
    ips = []
    try:
        # Get hostname
        hostname = socket.gethostname()
        # Get all addresses info
        addr_infos = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in addr_infos:
            if family == socket.AF_INET: # IPv4
                ip = sockaddr[0]
                if not ip.startswith("127."):
                    ips.append(ip)
    except:
        pass
    
    # Fallback/Always include localhost
    if not ips:
        ips.append("localhost")
    return ips

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

    # 2. Run Phase (Non-blocking with Popen)
    start_backend()
    time.sleep(2) # Give backend a moment
    start_frontend()

    # 3. Open Browser Phase
    backend_tunnel, frontend_tunnel = tunnels
    
    local_ips = get_local_ips()
    
    print("\n" + "="*50)
    print("   Application Available at:")
    for ip in local_ips:
        print(f"   - http://{ip}:8080")
    
    if backend_tunnel:
         # Just showing frontend tunnel if available
         pass
    if frontend_tunnel:
        print(f"   - {frontend_tunnel.public_url} (Remote w/ ngrok)")
    print("="*50 + "\n")

    # Pick the first non-localhost IP if available, else localhost
    target_ip = "localhost"
    for ip in local_ips:
        if ip != "localhost":
            target_ip = ip
            break
            
    target_url = f"http://{target_ip}:8080"

    print(f"[Ready] Attempting to open browser at {target_url} in 3 seconds...")
    
    def open_browser():
        time.sleep(3)
        print(f"[Ready] Opening {target_url}")
        webbrowser.open(target_url)

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        # Keep main thread alive and monitor processes
        while True:
            time.sleep(1)
            # Check if any process died unexpectedly
            for p in processes:
                if p.poll() is not None:
                    print(f"[Monitor] A process exited with code {p.returncode}. Shutting down...")
                    raise KeyboardInterrupt
    except KeyboardInterrupt:
        print("\n[Stop] Shutting down...")
        for p in processes:
            # Polite terminate
            p.terminate()
        
        # Give them a moment
        time.sleep(1)
        
        for p in processes:
            if p.poll() is None:
                # Force kill
                p.kill()
        
        sys.exit(0)

if __name__ == "__main__":
    main()
