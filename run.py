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
# Tunnel Configuration
TUNNEL_PROVIDER = os.environ.get("TUNNEL_PROVIDER", "ngrok").lower()

# Try to load from .env file
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            if line.startswith("TUNNEL_PROVIDER="):
                TUNNEL_PROVIDER = line.split("=", 1)[1].strip().strip('"').strip("'").lower()
            elif line.startswith("NGROK_AUTHTOKEN="):
                NGROK_AUTHTOKEN = line.split("=", 1)[1].strip().strip('"').strip("'")

print(f"[Config] Tunnel provider: {TUNNEL_PROVIDER}")
if TUNNEL_PROVIDER == "ngrok":
    if NGROK_AUTHTOKEN:
        print(f"[Config] NGROK_AUTHTOKEN loaded (starts with {NGROK_AUTHTOKEN[:5]}...)")
    else:
        print("[Config] No NGROK_AUTHTOKEN found for ngrok.")

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

def get_tunnel_url(process, provider):
    """Wait for tunnel process to output the public URL."""
    start_time = time.time()
    url = None
    while time.time() - start_time < 15: # 15s timeout
        line = process.stdout.readline()
        if not line:
            break
        line_str = line.decode('utf-8', errors='ignore').strip()
        if "your url is:" in line_str.lower():
            url = line_str.split("is:")[1].strip()
            break
    return url

def setup_tunnel():
    global USE_NGROK
    backend_url = None
    frontend_url = None

    if TUNNEL_PROVIDER == "ngrok":
        if not NGROK_AUTHTOKEN:
            print("[ngrok] No NGROK_AUTHTOKEN found. Skipping.")
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
            
            USE_NGROK = True
            backend_url = backend_tunnel.public_url
            frontend_url = frontend_tunnel.public_url
        except Exception as e:
            print(f"[ngrok] Error: {e}")
            return None, None

    elif TUNNEL_PROVIDER == "localtunnel":
        print("[localtunnel] Setting up tunnels via npx...")
        try:
            # Backend tunnel
            cmd_back = ["npx", "lt", "--port", "8000"]
            p_back = subprocess.Popen(cmd_back, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=is_windows())
            backend_url = get_tunnel_url(p_back, "localtunnel")
            processes.append(p_back)
            
            if backend_url:
                print(f"[localtunnel] Backend tunnel: {backend_url}")
            else:
                print("[localtunnel] Failed to get backend URL.")
                return None, None

            # Frontend tunnel
            cmd_front = ["npx", "lt", "--port", "8080"]
            p_front = subprocess.Popen(cmd_front, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=is_windows())
            frontend_url = get_tunnel_url(p_front, "localtunnel")
            processes.append(p_front)

            if frontend_url:
                print(f"[localtunnel] Frontend tunnel: {frontend_url}")
            else:
                print("[localtunnel] Failed to get frontend URL.")
                return None, None
            
            USE_NGROK = True # We use the same flag for 'using a tunnel' logic
        except Exception as e:
            print(f"[localtunnel] Error: {e}")
            return None, None

    if backend_url:
        # Write backend URL to frontend .env.local
        with open(os.path.join(FRONTEND_DIR, ".env.local"), "w") as f:
            f.write(f"VITE_API_BASE_URL={backend_url}\n")
        return backend_url, frontend_url

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
        tunnels = setup_tunnel()
    except Exception as e:
        print(f"[Error] Setup failed: {e}")
        sys.exit(1)

    print("\n=== Starting Services ===\n")

    # 2. Run Phase (Non-blocking with Popen)
    print("\n[Orchestrator] Starting Backend...")
    start_backend()
    
    print("[Orchestrator] Waiting for backend to initialize...")
    time.sleep(3) # Give backend a moment
    
    print("[Orchestrator] Starting Frontend...")
    start_frontend()
    
    print("[Orchestrator] Waiting for frontend to initialize...")
    time.sleep(2)

    # 3. Open Browser Phase
    backend_tunnel, frontend_tunnel = tunnels
    
    local_ips = get_local_ips()
    
    print("\n" + "="*50)
    print("   Application Available at:")
    for ip in local_ips:
        print(f"   - http://{ip}:8080")
    
    if frontend_tunnel:
        print(f"   - {frontend_tunnel.public_url} (Remote w/ ngrok)")
        try:
            import qrcode
            qr = qrcode.QRCode(version=1, border=1)
            qr.add_data(frontend_tunnel.public_url)
            qr.make(fit=True)
            print("\n   Scan to open on mobile:")
            qr.print_ascii(invert=True)
        except ImportError:
            pass
    print("="*50 + "\n")


    target_url = "http://localhost:8080"
    for ip in local_ips:
        if ip != "localhost":
            target_url = f"http://{ip}:8080"
            break

    print(f"[Ready] Attempting to open browser at {target_url} in 2 seconds...")
    
    def open_browser():
        time.sleep(2)
        try:
            webbrowser.open(target_url)
        except:
            pass

    threading.Thread(target=open_browser, daemon=True).start()

    print("\n[Monitor] Press Ctrl+C to shut down all services safely.\n")

    try:
        # Keep main thread alive and monitor processes
        while True:
            time.sleep(1)
            # Check if any process died unexpectedly
            for p in processes:
                if p.poll() is not None:
                    print(f"\n[Monitor] A service (PID {p.pid}) exited with code {p.returncode}. Shutting down...")
                    raise KeyboardInterrupt
    except KeyboardInterrupt:
        print("\n[Stop] Shutting down gracefully...")
        for p in processes:
            try:
                # Polite terminate
                if is_windows():
                    # On Windows, p.terminate() is same as p.kill() for non-GUI processes
                    # We try to be polite but Windows is Windows
                    p.terminate()
                else:
                    p.terminate()
            except:
                pass
        
        # Give them a moment to cleanup
        try:
            time.sleep(1)
        except KeyboardInterrupt:
            # If user presses Ctrl+C again during shutdown, move straight to kill
            pass
        
        for p in processes:
            if p.poll() is None:
                try:
                    # Force kill if still alive
                    p.kill()
                except:
                    pass
        
        print("[Stop] Cleanup complete. Goodbye.")
        sys.exit(0)

if __name__ == "__main__":
    main()
