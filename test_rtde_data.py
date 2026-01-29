import rtde.rtde as rtde
import rtde.rtde_config as rtde_config
import time
import sys

ROBOT_HOST = '192.168.15.130'
ROBOT_PORT = 30004
CONFIG_FILE = 'record_config.xml'

def test_data():
    conf = rtde_config.ConfigFile(CONFIG_FILE)
    state_names, state_types = conf.get_recipe('state')

    print(f"Connecting to {ROBOT_HOST}...")
    con = rtde.RTDE(ROBOT_HOST, ROBOT_PORT)
    con.connect()

    # get controller version
    con.get_controller_version()

    # setup recipes
    if not con.send_output_setup(state_names, state_types):
        print('Unable to configure output')
        sys.exit()

    # start RTDE interface
    if not con.send_start():
        print('Unable to start synchronization')
        sys.exit()

    print("Started synchronization. Reading data for 5 seconds...")
    
    try:
        start_time = time.time()
        while time.time() - start_time < 5:
            state = con.receive()
            if state is None:
                break
            
            # Print timestamp and actual_q
            print(f"Timestamp: {state.timestamp:.4f}, Actual Q: {['%.4f' % q for q in state.actual_q]}")
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Error during data reception: {e}")

    con.send_pause()
    con.disconnect()
    print("Disconnected.")

if __name__ == "__main__":
    test_data()
