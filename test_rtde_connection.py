import sys
import os

# Add the current directory to sys.path if needed, 
# but if installed via pip it should be in site-packages.

try:
    import rtde.rtde as rtde
    import rtde.rtde_config as rtde_config
    print("Successfully imported rtde")
except ImportError as e:
    print(f"Failed to import rtde: {e}")
    # Let's try another import style just in case
    try:
        import rtde
        print("Successfully imported rtde (top level)")
    except ImportError as e2:
        print(f"Failed to import top level rtde: {e2}")
        sys.exit(1)

ROBOT_HOST = '192.168.15.130'
ROBOT_PORT = 30004

def test_connection():
    print(f"Attempting to connect to {ROBOT_HOST}:{ROBOT_PORT}...")
    con = rtde.RTDE(ROBOT_HOST, ROBOT_PORT)
    try:
        con.connect()
        print("Connected successfully!")
        
        # Get controller version
        version = con.get_controller_version()
        print(f"Controller version: {version}")
        
        con.disconnect()
        print("Disconnected successfully.")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_connection()
