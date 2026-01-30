import asyncio
import socket
import struct
import ftplib
import os
import threading
import paramiko
import time
from typing import Optional
from datetime import datetime

try:
    import rtde.rtde as rtde
    import rtde.rtde_config as rtde_config
    RTDE_LIB_AVAILABLE = True
except ImportError:
    RTDE_LIB_AVAILABLE = False
    print("[RobotClient] Warning: RTDE library not found. Manual RTDE will be used (if implemented correctly) or fail.")


class RobotTCPClient:
    def __init__(self):
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.connected = False
        self.host: Optional[str] = None
        self.port: Optional[int] = None
        
        self.feedback_reader: Optional[asyncio.StreamReader] = None
        self.feedback_writer: Optional[asyncio.StreamWriter] = None
        self.feedback_connected = False
        
        self.dashboard_reader: Optional[asyncio.StreamReader] = None
        self.dashboard_writer: Optional[asyncio.StreamWriter] = None
        self.dashboard_connected = False
        self.dashboard_lock = asyncio.Lock()

        self.rtde_con: Optional[rtde.RTDE] = None
        self.rtde_config: Optional[rtde_config.ConfigFile] = None
        self.rtde_connected = False
        self.rtde_watch_input = None
        self.rtde_speed_slider = 1.0

        
        self.latest_state: Optional[dict] = None
        self.feedback_task: Optional[asyncio.Task] = None
        self.rtde_thread: Optional[threading.Thread] = None
        self.rtde_stop_event = threading.Event()
        self.status_poller_task: Optional[asyncio.Task] = None

        self.robot_mode: int = -1
        self.safety_mode: int = -1
        self.program_state: int = 0  # 0: STOPPED, 1: PLAYING, 2: PAUSED
        self.program_state_lock_until: float = 0.0
        self.loaded_program: Optional[str] = None

        self.ftp_user = os.getenv("ROBOT_SFTP_USER", "root")
        self.ftp_password = os.getenv("ROBOT_SFTP_PASSWORD", "easybot")


    async def connect(self, host: str, port: int) -> bool:
        """Connect to the UR5 robot controller with timeouts."""
        try:
            # 1. Primary command connection (usually 30002)
            print(f"[RobotClient] Connecting to {host}:{port}...")
            self.reader, self.writer = await asyncio.wait_for(
                asyncio.open_connection(host, port), 
                timeout=3.0
            )
            self.connected = True
            self.host = host
            self.port = port
            
            # 2. Feedback connection (port 30003)
            try:
                self.feedback_reader, self.feedback_writer = await asyncio.wait_for(
                    asyncio.open_connection(host, 30003), 
                    timeout=2.0
                )
                self.feedback_connected = True
                print(f"[RobotClient] Feedback connected on {host}:30003")
            except Exception as fe:
                print(f"[RobotClient] Feedback connection skipped/failed: {fe}")
                self.feedback_connected = False

            # 3. Dashboard connection (port 29999)
            try:
                self.dashboard_reader, self.dashboard_writer = await asyncio.wait_for(
                    asyncio.open_connection(host, 29999),
                    timeout=2.0
                )
                self.dashboard_connected = True
                # Read initial banner
                try:
                    await asyncio.wait_for(self.dashboard_reader.readuntil(b'\n'), timeout=1.0)
                except: pass
                print(f"[RobotClient] Dashboard connected on {host}:29999")
            except Exception as de:
                print(f"[RobotClient] Dashboard connection skipped/failed: {de}")
                self.dashboard_connected = False

            # 4. RTDE connection (Port 30004)
            if RTDE_LIB_AVAILABLE:
                try:
                    print(f"[RobotClient] RTDE: Connecting to {host}:30004...")
                    self.rtde_con = rtde.RTDE(host, 30004)
                    await asyncio.to_thread(self.rtde_con.connect)
                    
                    if await self._rtde_handshake():
                        self.rtde_connected = True
                        print(f"[RobotClient] RTDE fully synchronized via library")
                        # Start RTDE thread
                        self.rtde_stop_event.clear()
                        self.rtde_thread = threading.Thread(target=self._rtde_worker, daemon=True)
                        self.rtde_thread.start()
                    else:
                        print("[RobotClient] RTDE library handshake failed")
                        self.rtde_connected = False
                        await asyncio.to_thread(self.rtde_con.disconnect)
                except Exception as re:
                    print(f"[RobotClient] RTDE library connection failed: {re}")
                    self.rtde_connected = False
            else:
                print("[RobotClient] RTDE library not available, skipping RTDE.")

            # Start listener tasks
            if self.feedback_connected:
                self.feedback_task = asyncio.create_task(self._feedback_listener())

            
            # Start status poller (as fallback for RTDE or for richer info)
            if self.dashboard_connected or self.feedback_connected:
                self.status_poller_task = asyncio.create_task(self._status_poller())

            print(f"[RobotClient] Fully connected to {host}")
            return True
        except asyncio.TimeoutError:
            print(f"[RobotClient] Connection to {host}:{port} timed out")
            self.connected = False
            return False
        except Exception as e:
            print(f"[RobotClient] Connection failed: {e}")
            self.connected = False
            return False

    async def disconnect(self):
        """Disconnect from the robot."""
        # Stop feedback listener
        if self.feedback_task:
            self.feedback_task.cancel()
            try: await self.feedback_task
            except: pass
            self.feedback_task = None

        if self.status_poller_task:
            self.status_poller_task.cancel()
            try: await self.status_poller_task
            except: pass
            self.status_poller_task = None

        if self.rtde_thread:
            self.rtde_stop_event.set()
            self.rtde_thread = None

        if self.rtde_con:
            try: await asyncio.to_thread(self.rtde_con.disconnect)
            except: pass
            self.rtde_con = None

        # Close all async writers
        for w in [self.writer, self.feedback_writer, self.dashboard_writer]:
            if w:
                try:
                    w.close()
                    # We can't await wait_closed() here easily without a task if we want to be fast, 
                    # but let's try to do it properly
                except: pass

        self.connected = False
        self.feedback_connected = False
        self.dashboard_connected = False
        self.rtde_connected = False
        self.reader = None
        self.writer = None
        self.feedback_reader = None
        self.feedback_writer = None
        self.dashboard_reader = None
        self.dashboard_writer = None
        self.latest_state = None


        print("[RobotClient] Disconnected")

    async def send_command(self, urscript: str) -> bool:
        """Send a URScript command to the robot."""
        if not self.connected or not self.writer:
            print("[RobotClient] Not connected to robot")
            return False
        
        try:
            command = urscript
            # Ensure it ends with a newline
            if not command.endswith("\n"):
                command += "\n"

            # ONLY wrap in 'def' if it's a multi-line script and doesn't have one already
            # For single-line commands like 'set_speed_slider_fraction', send RAW for immediate execution
            if "\n" in urscript.strip() and "def " not in urscript:
                command = f"def secondary_program():\n{command}end\n"
                    
            self.writer.write(command.encode())
            await self.writer.drain()
            print(f"[RobotClient] Sent script: {urscript.strip()[:50]}...")
            return True
        except Exception as e:
            print(f"[RobotClient] Failed to send command: {e}")
            self.connected = False
            return False

    async def send_dashboard_command(self, command: str) -> Optional[str]:
        """Send a command to the Dashboard Server (port 29999) and return response."""
        if not self.dashboard_connected or not self.dashboard_writer or not self.dashboard_reader:
            return None
        
        async with self.dashboard_lock:
            try:
                cmd = command.strip() + "\n"
                self.dashboard_writer.write(cmd.encode())
                await self.dashboard_writer.drain()
                
                # Use wait_for to prevent hanging on dashboard response
                response = await asyncio.wait_for(
                    self.dashboard_reader.readuntil(b'\n'),
                    timeout=2.0
                )
                resp_text = response.decode().strip()
                print(f"[RobotClient] Dashboard: '{command}' -> '{resp_text}'")
                return resp_text
            except Exception as e:
                print(f"[RobotClient] Dashboard command '{command}' failed: {e}")
                self.dashboard_connected = False
                return None

    async def _setup_rtde_recipe(self, recipe_name: str, is_output: bool = True) -> Optional[any]:
        """Robustly setup an RTDE recipe by filtering out unsupported fields."""
        if not self.rtde_con or not self.rtde_config:
            return None
            
        names, _ = self.rtde_config.get_recipe(recipe_name)
        
        # Try full setup first (names only for flexibility)
        try:
            if is_output:
                res = await asyncio.to_thread(self.rtde_con.send_output_setup, names)
            else:
                res = await asyncio.to_thread(self.rtde_con.send_input_setup, names)
            
            if res:
                return res
        except Exception as e:
            print(f"[RobotClient] RTDE recipe '{recipe_name}' full setup failed: {e}. Retrying with field-by-field discovery...")

        # Field-by-field discovery
        supported_names = []
        for name in names:
            try:
                if is_output:
                    success = await asyncio.to_thread(self.rtde_con.send_output_setup, [name])
                else:
                    success = await asyncio.to_thread(self.rtde_con.send_input_setup, [name])
                
                if success:
                    supported_names.append(name)
            except Exception:
                # This field is likely not supported by this robot version
                continue
        
        if not supported_names:
            print(f"[RobotClient] RTDE recipe '{recipe_name}': No fields supported!")
            return None
            
        print(f"[RobotClient] RTDE recipe '{recipe_name}' negotiated. Supported: {supported_names}, Skipped: {list(set(names) - set(supported_names))}")
        
        # Final setup with supported fields
        try:
            if is_output:
                return await asyncio.to_thread(self.rtde_con.send_output_setup, supported_names)
            else:
                return await asyncio.to_thread(self.rtde_con.send_input_setup, supported_names)
        except Exception as e:
            print(f"[RobotClient] RTDE final setup for '{recipe_name}' failed: {e}")
            return None

    async def _rtde_handshake(self) -> bool:
        """Perform RTDE handshake and setup recipes using the library."""
        if not self.rtde_con:
            return False
        
        print("[RobotClient] Starting RTDE library handshake...")
        try:
            # 1. Get Controller Version
            version = await asyncio.to_thread(self.rtde_con.get_controller_version)
            print(f"[RobotClient] RTDE: Connected to robot version: {version}")

            # 2. Load config
            config_path = os.path.join(os.getcwd(), "record_config.xml")
            if not os.path.exists(config_path):
                config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "record_config.xml")
            
            print(f"[RobotClient] RTDE: Using config at {config_path}")
            self.rtde_config = rtde_config.ConfigFile(config_path)
            
            # 3. Setup Outputs (Dynamic)
            if not await self._setup_rtde_recipe('state', is_output=True):
                print("[RobotClient] RTDE: Failed to setup outputs")
                return False
                
            # 4. Setup Inputs (Dynamic)
            self.rtde_watch_input = await self._setup_rtde_recipe('set_speed', is_output=False)
            if not self.rtde_watch_input:
                print("[RobotClient] RTDE: Input setup failed/skipped (speed slider control via RTDE may be disabled)")

            # 5. Start synchronization
            if not await asyncio.to_thread(self.rtde_con.send_start):
                print("[RobotClient] RTDE: Failed to start synchronization")
                return False
                
            print("[RobotClient] RTDE library handshake complete")
            return True
        except Exception as e:
            print(f"[RobotClient] RTDE library handshake error: {e}")
            return False

    def _rtde_worker(self):
        """Dedicated thread for reading RTDE data packages."""
        print("[RobotClient] Thread: Starting RTDE worker")
        while not self.rtde_stop_event.is_set() and self.rtde_connected and self.rtde_con:
            try:
                state = self.rtde_con.receive()
                if state is None:
                    print("[RobotClient] RTDE: Received None, stopping worker")
                    break
                
                # Update modes and speed
                rm = getattr(state, 'robot_mode', None)
                sm = getattr(state, 'safety_mode', None)
                rs = getattr(state, 'output_runtime_state', None)
                if rm is not None: self.robot_mode = rm
                if sm is not None: self.safety_mode = sm
                
                # Map RTDE runtime_state to internal program_state
                # RTDE: 0=stopped, 1=playing, 2=pausing, 3=paused, 4=resuming
                # Internal: 0: STOPPED, 1: PLAYING, 2: PAUSED
                if rs is not None and time.time() > self.program_state_lock_until:
                    if rs == 0: self.program_state = 0
                    elif rs in [1, 4]: self.program_state = 1
                    elif rs in [2, 3]: self.program_state = 2
                
                # actual_TCP_pose
                tcp_pose = getattr(state, 'actual_TCP_pose', None)
                
                # actual_q
                q_actual = getattr(state, 'actual_q', None)
                
                # Robust Speed Handling:
                # On some robots (v5.9), 'target_speed_fraction' represents the slider while 'speed_scaling'
                # jumps to 1.0 when running. On others, it's the opposite.
                # We prioritize the value that is "in the middle" (0.0 < val < 1.0) to avoid jumps to extremes.
                ss = getattr(state, 'speed_scaling', None)
                tsf = getattr(state, 'target_speed_fraction', None)
                
                if tsf is not None and 0.0 < tsf < 1.0:
                    self.rtde_speed_slider = tsf
                elif ss is not None and 0.0 < ss < 1.0:
                    self.rtde_speed_slider = ss
                else:
                    # Fallback if both are at extremes (0.0, 1.0) or missing
                    self.rtde_speed_slider = max(ss if ss is not None else 1.0, tsf if tsf is not None else 1.0)

                # Update latest_state
                if q_actual is not None and tcp_pose is not None:
                    self.latest_state = {
                        "joints": list(q_actual),
                        "tcp_pose": list(tcp_pose),
                        "tcp_offset": [0.0] * 6,
                        "speed_slider": self.rtde_speed_slider,
                        "timestamp": datetime.now().isoformat()
                    }



            except Exception as e:
                print(f"[RobotClient] RTDE worker error: {e}")
                break
        
        self.rtde_connected = False
        print("[RobotClient] Thread: RTDE worker stopped")

    async def _send_rtde_package(self, p_type: int, payload: bytes):
        pass # No longer used

    async def _read_rtde_package(self) -> tuple[int, int, bytes]:
        return 0, 0, b"" # No longer used


    # Added instance variable to store TCP offset from RTDE

    # Removed _rtde_listener as it's replaced by _rtde_worker thread

    async def set_robot_speed(self, fraction: float) -> bool:
        """Set the speed slider using RTDE (falling back to URScript if RTDE fails)."""
        safe_fraction = max(0.0, min(1.0, fraction))
        self.rtde_speed_slider = safe_fraction
        
        print(f"[RobotClient] Setting speed slider to {safe_fraction*100:.1f}%")
        
        if self.rtde_connected and self.rtde_con and self.rtde_watch_input:
            try:
                # Check if fields exist on negotiated recipe
                if hasattr(self.rtde_watch_input, 'speed_slider_mask') and hasattr(self.rtde_watch_input, 'speed_slider_fraction'):
                    # Prepare input data
                    self.rtde_watch_input.speed_slider_mask = 1
                    self.rtde_watch_input.speed_slider_fraction = safe_fraction
                    # Send
                    await asyncio.to_thread(self.rtde_con.send, self.rtde_watch_input)
                    print(f"[RobotClient] Speed command sent via RTDE")
                    return True
                else:
                    print(f"[RobotClient] RTDE: Speed slider fields not supported by this robot. Falling back to URScript.")
            except Exception as e:
                print(f"[RobotClient] RTDE speed command failed: {e}. Falling back to URScript.")
        
        # Fallback to URScript
        script = f"set_speed_slider_fraction({safe_fraction})"
        return await self.send_command(script)

    def is_connected(self) -> bool:
        return self.connected

    async def read_state(self) -> Optional[dict]:
        """Return the latest parsed robot state."""
        if self.latest_state:
            state = self.latest_state.copy()
            state["robot_mode"] = self.robot_mode
            state["safety_mode"] = self.safety_mode
            state["program_state"] = self.program_state
            state["loaded_program"] = self.loaded_program
            return state
        
        # Fallback if feedback hasn't arrived yet but we are connected
        if self.connected:
             return {
                "joints": [0.0]*6,
                "tcp_pose": [0.0]*6,
                "tcp_offset": [0.0]*6,
                "speed_slider": self.rtde_speed_slider,
                "robot_mode": self.robot_mode,
                "safety_mode": self.safety_mode,
                "program_state": self.program_state,
                "loaded_program": self.loaded_program,
                "timestamp": datetime.now().isoformat()
            }
        return None

    async def _status_poller(self):
        """Fallback poller to get robot status via Dashboard if RTDE is not providing it."""
        print("[RobotClient] Starting status poller task")
        while self.connected:
            try:
                if self.dashboard_connected:
                    # 1. Status Polling (Fallback for RTDE)
                    if not self.rtde_connected:
                        # 1a. Robot Mode
                        mode_resp = await self.send_dashboard_command("robotmode")
                        if mode_resp and "robotmode:" in mode_resp.lower():
                            low_mode = mode_resp.lower()
                            if "running" in low_mode: self.robot_mode = 7
                            elif "idle" in low_mode: self.robot_mode = 5
                            elif "power_on" in low_mode: self.robot_mode = 4
                            elif "power_off" in low_mode: self.robot_mode = 3
                            elif "booting" in low_mode: self.robot_mode = 2
                            elif "confirm_safety" in low_mode: self.robot_mode = 1
                            elif "disconnected" in low_mode: self.robot_mode = 0

                        # 1b. Program State
                        prog_resp = await self.send_dashboard_command("programState")
                        if prog_resp:
                            low_prog = prog_resp.lower()
                            if "playing" in low_prog: self.program_state = 1
                            elif "paused" in low_prog: self.program_state = 2
                            elif "stopped" in low_prog: self.program_state = 0
                        
                        # 1c. Safety Status
                        safety_resp = await self.send_dashboard_command("safetystatus")
                        if safety_resp and "safetystatus:" in safety_resp.lower():
                            if "PROTECTIVE_STOP" in safety_resp: self.safety_mode = 3
                            elif "EMERGENCY_STOP" in safety_resp: self.safety_mode = 4
                            elif "NORMAL" in safety_resp: self.safety_mode = 1

                    # 2. Program Name (ALWAYS poll this as it's not available in RTDE)
                    self.loaded_program = await self.get_loaded_program()

                await asyncio.sleep(2.0) # Poll every 2 seconds (dashboard is slow)
            except Exception as e:
                print(f"[RobotClient] Status poller error: {e}")
                await asyncio.sleep(5.0)
        print("[RobotClient] Status poller stopped")

    # Constants for tracking the speed offset once found
    _speed_offset_cache = None

    async def _feedback_listener(self):
        """Background task that continuously reads and parses robot state."""
        print("[RobotClient] Starting feedback listener")
        packet_count = 0
        logged_info = False
        
        while self.feedback_connected and self.feedback_reader:
            try:
                try:
                    header = await self.feedback_reader.readexactly(4)
                except Exception: break
                
                length = struct.unpack('!i', header)[0]
                if not logged_info:
                    print(f"[RobotClient] Robot Type: {'e-Series' if length >= 1108 else 'CB3'}, Length: {length}")
                    logged_info = True
                
                try:
                    data = header + await self.feedback_reader.readexactly(length - 4)
                except Exception: break
                
                packet_count += 1
                if packet_count % 5 != 0:
                    await asyncio.sleep(0)
                    continue

                if length >= 444 + 48:
                    q_actual = struct.unpack('!6d', data[252:252+48])
                    tcp_actual = struct.unpack('!6d', data[444:444+48])
                    
                    speed_slider = self.rtde_speed_slider
                    
                    if not self.rtde_connected:
                        # URSim 5.12.6 does not transmit speed slider in 30003 feedback
                        # We keep the last speed value the user set via the UI
                        speed_slider = self.rtde_speed_slider

                    self.latest_state = {
                        "joints": list(q_actual),
                        "tcp_pose": list(tcp_actual),
                        "tcp_offset": [0.0] * 6,
                        "speed_slider": speed_slider,
                        "timestamp": datetime.now().isoformat()
                    }

                    
                    # if packet_count % 125 == 0:
                    #     if self.rtde_connected:
                    #         print(f"[RobotClient] Update [RTDE]: J1={q_actual[0]:.2f}, Speed={speed_slider*100:.1f}%")
                    #     else:
                    #         print(f"[RobotClient] Update: J1={q_actual[0]:.2f}, TCPz={tcp_actual[2]:.2f}")

                
                await asyncio.sleep(0)
            except Exception as e:
                print(f"[RobotClient] Feedback loop error: {e}")
                await asyncio.sleep(1)
                
        self.feedback_connected = False
    async def list_programs(self) -> list[str]:
        """List .urp programs via SFTP with better robustness."""
        if not self.host:
             return []
        
        def _sftp_list():
            programs = []
            ssh = None
            try:
                print(f"[RobotClient] SFTP: Connecting to {self.host}:22...")
                ssh = paramiko.SSHClient()
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                try:
                    ssh.connect(self.host, port=22, username=self.ftp_user, password=self.ftp_password, timeout=5.0)
                except paramiko.AuthenticationException:
                    if self.ftp_user == "root":
                        print(f"[RobotClient] SFTP: Authentication failed for 'root', trying 'universal-robots'...")
                        ssh.connect(self.host, port=22, username="universal-robots", password=self.ftp_password, timeout=5.0)
                    else:
                        raise
                
                sftp = ssh.open_sftp()
                
                # List of potential directories where programs might be stored
                search_dirs = ["/programs", "/root/programs", "/home/root", "/"]
                
                for target_dir in search_dirs:
                    try:
                        print(f"[RobotClient] SFTP: Trying directory '{target_dir}'")
                        files = sftp.listdir(target_dir)
                        program_files = [f for f in files if f.endswith('.urp')]
                        if program_files:
                            print(f"[RobotClient] SFTP: Found {len(program_files)} programs in '{target_dir}'")
                            programs.extend(program_files)
                    except Exception as e:
                        # Some dirs might not exist or be accessible, that's fine
                        continue
                
                sftp.close()
                ssh.close()
                # Remove duplicates if any
                programs = list(set(programs))
            except Exception as e:
                print(f"[RobotClient] SFTP global operations failed: {e}")
                if ssh:
                    ssh.close()
            return sorted(programs)

        return await asyncio.to_thread(_sftp_list)

    async def load_program(self, program_name: str) -> tuple[bool, str]:
        """Load a program via Dashboard server. Returns (success, message)."""
        if not self.dashboard_connected:
            return False, "Not connected to Dashboard"
        
        last_result = ""
        # Try up to 3 times to handle stale responses
        for attempt in range(3):
            result = await self.send_dashboard_command(f"load {program_name}")
            if result is None:
                return False, "No response from Dashboard"
            
            last_result = result
            low_res = result.lower()

            # Handle explicit errors
            if "remote control mode is disabled" in low_res:
                return False, result
            
            if "failed to execute" in low_res:
                if "load" in low_res:
                    return False, result
                if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                return False, result
            
            # Check for other errors
            if "file not found" in low_res or "error" in low_res or "failed" in low_res:
                return False, result
            
            # Ignore connection banners
            if "connected:" in low_res or "dashboard server" in low_res:
                if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                return False, result
            
            # Reject stale state messages (from previous commands)
            stale_states = ["pausing", "paused", "stopped", "stopping", "starting", "playing"]
            if any(state in low_res for state in stale_states) and "loading" not in low_res:
                if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                return False, result
            
            # Accept loading/loaded responses
            if "loading" in low_res or "loaded" in low_res:
                self.loaded_program = program_name
                return True, result
        
        return False, last_result

    async def play_program(self) -> tuple[bool, str]:
        """Start or Resume loaded program via Dashboard server. Returns (success, message)."""
        if not self.dashboard_connected:
            return False, "Not connected to Dashboard"
        
        last_result = ""
        # Try up to 3 times to handle stale responses and echoes
        for attempt in range(3):
            result = await self.send_dashboard_command("play")
            if result is None:
                return False, "No response from Dashboard"
                
            last_result = result
            low_res = result.lower()

            # Handle explicit errors
            if "remote control mode is disabled" in low_res:
                return False, result

            if "failed to execute" in low_res:
                if "play" in low_res:
                    return False, result
                if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                return False, result
            
            # Check for other errors
            if "error" in low_res or "failed" in low_res:
                return False, result
            
            # Ignore connection banners
            if "connected:" in low_res or "dashboard server" in low_res:
                if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                return False, result

            # Stale rejection: if we see "stopped", "pausing", "paused", it's definitely stale
            if any(x in low_res for x in ["stopped", "stopping", "paused", "pausing"]):
                 if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                 return False, result
            
            # URSim 5.12.6 quirk: "Loading program..." might come back.
            # If it's the FIRST attempt, it's likely a stale echo of the 'load' command. Retry.
            if "loading" in low_res:
                if attempt == 0:
                    await asyncio.sleep(0.2) # Wait a bit longer
                    continue
                # If it persists on subsequent attempts, assume it's the quirk and accept it
                return True, result

            if any(x in low_res for x in ["starting", "playing", "started"]):
                self.program_state = 1
                self.program_state_lock_until = time.time() + 1.0
                return True, result
            
            # Retry if we got something else unknown
            if attempt < 2:
                await asyncio.sleep(0.1)
                continue
        
        return False, last_result


    async def pause_program(self) -> tuple[bool, str]:
        """Pause program via Dashboard server. Returns (success, message)."""
        if not self.dashboard_connected:
            return False, "Not connected to Dashboard"
        
        last_result = ""
        # Try up to 3 times to handle stale responses
        for attempt in range(3):
            result = await self.send_dashboard_command("pause")
            if result is None:
                return False, "No response from Dashboard"
                
            last_result = result
            low_res = result.lower()

            # Handle explicit errors
            if "remote control mode is disabled" in low_res:
                return False, result

            if "failed to execute" in low_res:
                if "pause" in low_res:
                    return False, result
                if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                return False, result

            if "error" in low_res or "failed" in low_res:
                return False, result

            # Ignore connection banners
            if "connected:" in low_res or "dashboard server" in low_res:
                if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                return False, result
            
            # Accept pausing/paused responses
            if any(x in low_res for x in ["pausing", "paused"]):
                self.program_state = 2
                self.program_state_lock_until = time.time() + 1.0
                return True, result
            
            # Retry if we got a stale state like "starting", "playing", "loading", "stopped"
            if attempt < 2:
                await asyncio.sleep(0.1)
                continue
        
        return False, last_result

    async def stop_program(self) -> tuple[bool, str]:
        """Stop program via Dashboard server. Returns (success, message)."""
        if not self.dashboard_connected:
            return False, "Not connected to Dashboard"
        
        last_result = ""
        # Try up to 3 times to handle stale responses
        for attempt in range(3):
            result = await self.send_dashboard_command("stop")
            if result is None:
                return False, "No response from Dashboard"
                
            last_result = result
            low_res = result.lower()

            # Handle explicit errors
            if "remote control mode is disabled" in low_res:
                return False, result

            if "failed to execute" in low_res:
                if "stop" in low_res:
                    return False, result
                if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                return False, result

            if "error" in low_res or "failed" in low_res:
                return False, result

            # Ignore connection banners
            if "connected:" in low_res or "dashboard server" in low_res:
                if attempt < 2:
                    await asyncio.sleep(0.1)
                    continue
                return False, result
            
            # Accept stopped/stopping responses
            if any(x in low_res for x in ["stopped", "stopping"]):
                self.program_state = 0
                self.program_state_lock_until = time.time() + 1.0
                return True, result
            
            # Retry if we got a stale state like "starting", "playing", "loading", "paused"
            if attempt < 2:
                await asyncio.sleep(0.1)
                continue
        
        return False, last_result

    async def get_loaded_program(self) -> Optional[str]:
        """Get the path of the currently loaded program."""
        if not self.dashboard_connected:
            return None
        result = await self.send_dashboard_command("get loaded program")
        if result and "Loaded program:" in result:
            return result.replace("Loaded program:", "").strip()
        return result

    async def unlock_protective_stop(self) -> tuple[bool, str]:
        """Unlock protective stop via Dashboard server."""
        if not self.dashboard_connected:
            return False, "Not connected to Dashboard"
        
        result = await self.send_dashboard_command("unlock protective stop")
        if result is None:
            return False, "No response from Dashboard"
        
        low_res = result.lower()
        if "protective stop releasing" in low_res or "unlocking" in low_res:
            return True, result
        
        return False, result


# Global robot client instance
robot_client = RobotTCPClient()
