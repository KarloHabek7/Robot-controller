import subprocess
import sys
import os
import platform
import time
import threading
import signal
import re
import socket

# Configuration
BACKEND_DIR = "backend"
FRONTEND_DIR = "frontend"
VENV_DIR = ".venv"
REQUIREMENTS_FILE = os.path.join(BACKEND_DIR, "requirements.txt")
# Tunnel Configuration
# Options: "none", "cloudflare"
DEFAULT_TUNNEL_PROVIDER = "none"

# Allow overriding via command line argument (e.g., python run.py cloudflare)
TUNNEL_PROVIDER = sys.argv[1].lower() if len(sys.argv) > 1 else DEFAULT_TUNNEL_PROVIDER

print(f"[Config] Tunnel provider: {TUNNEL_PROVIDER}")

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



def setup_tunnel():
    global USE_NGROK
    backend_url = None
    frontend_url = None

    if TUNNEL_PROVIDER == "none":
        print("[Tunnel] Tunnel provider disabled (using local access only).")
        
        # Find the local IP (e.g., 192.168.1.15) to configure the frontend
        local_ip = "localhost"
        try:
            # Connect to a dummy external IP to get the interface IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
        except:
            pass
            
        print(f"[Config] Configuring Frontend to use Local IP: http://{local_ip}:8000")
        
        # Write the Local IP to the frontend .env.local
        with open(os.path.join(FRONTEND_DIR, ".env.local"), "w") as f:
            f.write(f"VITE_API_BASE_URL=http://{local_ip}:8000\n")
            
        USE_NGROK = False
        return None, None

    elif TUNNEL_PROVIDER == "cloudflare":
        print("[cloudflare] Setting up tunnels...")
        try:
            # Check if cloudflared.exe exists
            exe_path = "cloudflared.exe"
            if not os.path.exists(exe_path):
                # Try finding it in PATH
                exe_path = "cloudflared"
            
            # Backend Tunnel
            cmd_back = [exe_path, "tunnel", "--url", "http://localhost:8000"]
            p_back = subprocess.Popen(cmd_back, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=is_windows())
            
            # Cloudflare prints URL to stderr usually, but we captured stdout/err together
            start_time = time.time()
            while time.time() - start_time < 15:
                line = p_back.stdout.readline()
                if not line: break
                line_str = line.decode('utf-8', errors='ignore').strip()
                # Look for trycloudflare.com
                if "trycloudflare.com" in line_str:
                    match = re.search(r'https?://[a-zA-Z0-9-]+\.trycloudflare\.com', line_str)
                    if match:
                        backend_url = match.group(0)
                        print(f"[cloudflare] Backend: {backend_url}")
                        break
            processes.append(p_back)

            # Frontend Tunnel
            cmd_front = [exe_path, "tunnel", "--url", "http://localhost:8080"]
            p_front = subprocess.Popen(cmd_front, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=is_windows())
            
            start_time = time.time()
            while time.time() - start_time < 15:
                line = p_front.stdout.readline()
                if not line: break
                line_str = line.decode('utf-8', errors='ignore').strip()
                if "trycloudflare.com" in line_str:
                    match = re.search(r'https?://[a-zA-Z0-9-]+\.trycloudflare\.com', line_str)
                    if match:
                        frontend_url = match.group(0)
                        print(f"[cloudflare] Frontend: {frontend_url}")
                        break
            processes.append(p_front)
            
            USE_NGROK = True
        except Exception as e:
            print(f"[cloudflare] Error: {e}")
            print("Make sure 'cloudflared.exe' is in this folder!")
            return None, None

    if backend_url:
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
        "--host", "0.0.0.0", 
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
    # Always force HTTP to match backend to avoid mixed content/ssl errors
    env["VITE_NO_HTTPS"] = "true"

    # Use Popen to keep track of the process
    p = subprocess.Popen(cmd, cwd=FRONTEND_DIR, shell=is_windows(), env=env)
    processes.append(p)
    return p

def get_local_ips():
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
    
    
    # QR Code Logic
    qr_url = None
    if frontend_tunnel:
        print(f"   - {frontend_tunnel} (Remote)")
        qr_url = frontend_tunnel

    # Even if no tunnel, we might want to show QR for local IP if easy access is desired
    if not qr_url and TUNNEL_PROVIDER == "none":
         # Pick the first non-localhost IP
        for ip in local_ips:
            if ip != "localhost":
                qr_url = f"http://{ip}:8080"
                break

    if qr_url:
        try:
            import qrcode
            qr = qrcode.QRCode(version=1, border=1)
            qr.add_data(qr_url)
            qr.make(fit=True)
            print(f"\n   Scan to open on mobile ({qr_url}):")
            qr.print_ascii(invert=True)
        except ImportError:
            pass
    print("="*50 + "\n")


    target_url = "http://localhost:8080"
    for ip in local_ips:
        if ip != "localhost":
            target_url = f"http://{ip}:8080"
            break

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
