import asyncio
import socket
import struct
import ftplib
import os
from typing import Optional
from datetime import datetime


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

        self.rtde_reader: Optional[asyncio.StreamReader] = None
        self.rtde_writer: Optional[asyncio.StreamWriter] = None
        self.rtde_connected = False
        self.rtde_input_recipe_id = 0
        self.rtde_output_recipe_id = 0
        self.rtde_speed_slider = 1.0
        
        self.latest_state: Optional[dict] = None
        self.feedback_task: Optional[asyncio.Task] = None
        self.rtde_task: Optional[asyncio.Task] = None

        self.ftp_user = "root"
        self.ftp_password = "easybot"

    # RTDE Protocol Constants
    RTDE_REQUEST_PROTOCOL_VERSION = 1
    RTDE_GET_URCONTROL_VERSION = 2
    RTDE_TEXT_MESSAGE = 3
    RTDE_DATA_PACKAGE = 4
    RTDE_CONTROL_PACKAGE_SETUP_OUTPUTS = 5
    RTDE_CONTROL_PACKAGE_SETUP_INPUTS = 6
    RTDE_CONTROL_PACKAGE_START = 7
    RTDE_CONTROL_PACKAGE_PAUSE = 8

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
                print(f"[RobotClient] Dashboard connected on {host}:29999")
            except Exception as de:
                print(f"[RobotClient] Dashboard connection skipped/failed: {de}")
                self.dashboard_connected = False

            # 4. RTDE connection (Port 30004)
            try:
                self.rtde_reader, self.rtde_writer = await asyncio.wait_for(
                    asyncio.open_connection(host, 30004), 
                    timeout=2.0
                )
                print(f"[RobotClient] RTDE socket connected on {host}:30004")
                if await asyncio.wait_for(self._rtde_handshake(), timeout=5.0):
                    self.rtde_connected = True
                    print(f"[RobotClient] RTDE fully synchronized")
                else:
                    print("[RobotClient] RTDE handshake failed")
                    self.rtde_connected = False
                    if self.rtde_writer:
                        self.rtde_writer.close()
            except Exception as re:
                print(f"[RobotClient] RTDE connection skipped/failed: {re}")
                self.rtde_connected = False

            # Start listener tasks
            if self.feedback_connected:
                self.feedback_task = asyncio.create_task(self._feedback_listener())
            if self.rtde_connected:
                self.rtde_task = asyncio.create_task(self._rtde_listener())

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
            try:
                await self.feedback_task
            except asyncio.CancelledError:
                pass
            self.feedback_task = None

        if self.rtde_task:
            self.rtde_task.cancel()
            try:
                await self.rtde_task
            except asyncio.CancelledError:
                pass
            self.rtde_task = None

        if self.writer:
            self.writer.close()
            await self.writer.wait_closed()
        if self.feedback_writer:
            self.feedback_writer.close()
            await self.feedback_writer.wait_closed()
        if self.dashboard_writer:
            self.dashboard_writer.close()
            await self.dashboard_writer.wait_closed()
        if self.rtde_writer:
            self.rtde_writer.close()
            await self.rtde_writer.wait_closed()
            
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
        self.rtde_reader = None
        self.rtde_writer = None
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

    async def _rtde_handshake(self) -> bool:
        """Perform RTDE handshake and setup recipes."""
        print("[RobotClient] Starting RTDE handshake...")
        try:
            # 1. Request Protocol Version (try v2 then v1)
            print("[RobotClient] RTDE: Requesting version 2")
            payload = struct.pack(">B", 2)
            print(f"[RobotClient] RTDE: Sending packet: {(struct.pack('>HB', len(payload) + 3, self.RTDE_REQUEST_PROTOCOL_VERSION) + payload).hex()}")
            await self._send_rtde_package(self.RTDE_REQUEST_PROTOCOL_VERSION, payload)
            
            # Loop to skip any initial text messages
            res_type = -1
            res_data = b""
            error_msgs = []
            for _ in range(5):
                res_len, res_type, res_data = await self._read_rtde_package()
                print(f"[RobotClient] RTDE: Received type={res_type}, len={res_len}, data={res_data.hex()}")
                if res_type == self.RTDE_TEXT_MESSAGE:
                    msg = res_data[1:].decode(errors='ignore') if len(res_data) > 1 else res_data.decode(errors='ignore')
                    error_msgs.append(msg)
                    print(f"[RTDE Error] {msg}")
                    continue
                break

            version_accepted = False
            if res_type == self.RTDE_REQUEST_PROTOCOL_VERSION and res_data and res_data[0] == 1:
                version_accepted = True
                print("[RobotClient] RTDE: Protocol version 2 accepted")
            else:
                print(f"[RobotClient] RTDE: Version 2 failed (type {res_type}). Trying version 1.")
                payload = struct.pack(">B", 1)
                print(f"[RobotClient] RTDE: Sending packet: {(struct.pack('>HB', len(payload) + 3, self.RTDE_REQUEST_PROTOCOL_VERSION) + payload).hex()}")
                await self._send_rtde_package(self.RTDE_REQUEST_PROTOCOL_VERSION, payload)
                for _ in range(5):
                    res_len, res_type, res_data = await self._read_rtde_package()
                    print(f"[RobotClient] RTDE: Received type={res_type}, len={res_len}, data={res_data.hex()}")
                    if res_type == self.RTDE_TEXT_MESSAGE:
                        msg = res_data[1:].decode(errors='ignore') if len(res_data) > 1 else res_data.decode(errors='ignore')
                        error_msgs.append(msg)
                        print(f"[RTDE Error] {msg}")
                        continue
                    break
                if res_type == self.RTDE_REQUEST_PROTOCOL_VERSION and res_data and res_data[0] == 1:
                    version_accepted = True
                    print("[RobotClient] RTDE: Protocol version 1 accepted")
            
            if not version_accepted:
                print(f"[RobotClient] RTDE: Handshake failed. Robot errors: {error_msgs}")
                return False

            # 2. Setup Outputs (speed_scaling, actual_TCP_offset)
            output_vars = "speed_scaling,target_speed_fraction,actual_TCP_offset"
            print(f"[RobotClient] RTDE: Setting up outputs: {output_vars}")
            await self._send_rtde_package(self.RTDE_CONTROL_PACKAGE_SETUP_OUTPUTS, output_vars.encode())
            res_len, res_type, res_data = await self._read_rtde_package()
            if res_type != self.RTDE_CONTROL_PACKAGE_SETUP_OUTPUTS:
                print(f"[RobotClient] RTDE: Setup outputs failed (type {res_type})")
                return False
            self.rtde_output_recipe_id = res_data[0]
            print(f"[RobotClient] RTDE: Output recipe ID: {self.rtde_output_recipe_id}")

            # 3. Setup Inputs (speed control)
            input_vars = "speed_slider_mask,speed_slider_fraction"
            print(f"[RobotClient] RTDE: Setting up inputs: {input_vars}")
            await self._send_rtde_package(self.RTDE_CONTROL_PACKAGE_SETUP_INPUTS, input_vars.encode())
            res_len, res_type, res_data = await self._read_rtde_package()
            if res_type != self.RTDE_CONTROL_PACKAGE_SETUP_INPUTS:
                print(f"[RobotClient] RTDE: Setup inputs failed (type {res_type})")
                return False
            self.rtde_input_recipe_id = res_data[0]
            print(f"[RobotClient] RTDE: Input recipe ID: {self.rtde_input_recipe_id}")

            # 4. Start synchronization
            print("[RobotClient] RTDE: Starting synchronization")
            await self._send_rtde_package(self.RTDE_CONTROL_PACKAGE_START, b"")
            res_len, res_type, res_data = await self._read_rtde_package()
            if res_type == self.RTDE_CONTROL_PACKAGE_START and res_data and res_data[0] == 1:
                print("[RobotClient] RTDE: Synchronization started")
                return True
            
            print(f"[RobotClient] RTDE: Start sync failed (type {res_type})")
            return False
        except Exception as e:
            print(f"[RobotClient] RTDE Handshake global error: {e}")
            return False

    async def _send_rtde_package(self, p_type: int, payload: bytes):
        if not self.rtde_writer: return
        length = len(payload) + 3
        header = struct.pack(">HB", length, p_type)
        self.rtde_writer.write(header + payload)
        await self.rtde_writer.drain()

    async def _read_rtde_package(self) -> tuple[int, int, bytes]:
        if not self.rtde_reader: return 0, 0, b""
        try:
            # Read header with timeout
            header = await asyncio.wait_for(self.rtde_reader.readexactly(3), timeout=1.0)
            length, p_type = struct.unpack(">HB", header)
            
            # Read payload with timeout
            payload = await asyncio.wait_for(self.rtde_reader.readexactly(length - 3), timeout=1.0)
            return length, p_type, payload
        except (asyncio.TimeoutError, asyncio.IncompleteReadError):
            return 0, 0, b""

    # Added instance variable to store TCP offset from RTDE
    rtde_tcp_offset = [0.0] * 6

    async def _rtde_listener(self):
        """Background task to read RTDE data packages."""
        print("[RobotClient] Starting RTDE listener")
        while self.rtde_connected and self.rtde_reader:
            try:
                length, p_type, data = await self._read_rtde_package()
                if p_type == self.RTDE_DATA_PACKAGE:
                    recipe_id = data[0]
                    if recipe_id == self.rtde_output_recipe_id:
                        # Output recipe: 2 doubles (speed) + 6 doubles (TCP offset) = 8 doubles
                        # Unpack string: ">dddddddd"
                        vals = struct.unpack(">dddddddd", data[1:])
                        self.rtde_speed_slider = max(vals[0], vals[1])
                        self.rtde_tcp_offset = list(vals[2:8])
                elif p_type == self.RTDE_TEXT_MESSAGE:
                    msg = data[1:].decode(errors='ignore')
                    print(f"[RTDE Msg] {msg}")
                
                await asyncio.sleep(0.01) # 100Hz
            except Exception as e:
                if self.rtde_connected:
                    print(f"[RobotClient] RTDE listener error: {e}")
                break
        self.rtde_connected = False
        print("[RobotClient] RTDE listener stopped")

    async def set_robot_speed(self, fraction: float) -> bool:
        """Set the speed slider using URScript."""
        # Clamp value between 0.0 and 1.0 for safety
        safe_fraction = max(0.0, min(1.0, fraction))
        
        # Store the target speed for UI feedback (since we can't read it back)
        self.rtde_speed_slider = safe_fraction
        
        print(f"[RobotClient] Setting speed slider to {safe_fraction*100:.1f}% (raw value: {safe_fraction})")
        
        # Send raw command (newline handled by send_command)
        script = f"set_speed_slider_fraction({safe_fraction})"
        success = await self.send_command(script)
        
        if success:
            print(f"[RobotClient] Speed command sent successfully")
        else:
            print(f"[RobotClient] Speed command FAILED")
            
        return success

    def is_connected(self) -> bool:
        return self.connected

    async def read_state(self) -> Optional[dict]:
        """Return the latest parsed robot state."""
        if self.latest_state:
            return self.latest_state.copy()
        return None

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
                        "tcp_offset": self.rtde_tcp_offset,
                        "speed_slider": speed_slider,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    if packet_count % 125 == 0:
                        if self.rtde_connected:
                            print(f"[RobotClient] Update [RTDE]: J1={q_actual[0]:.2f}, Speed={speed_slider*100:.1f}%")
                        else:
                            print(f"[RobotClient] Update: J1={q_actual[0]:.2f}, TCPz={tcp_actual[2]:.2f}")
                
                await asyncio.sleep(0)
            except Exception as e:
                print(f"[RobotClient] Feedback loop error: {e}")
                await asyncio.sleep(1)
                
        self.feedback_connected = False
    async def list_programs(self) -> list[str]:
        """List .urp programs via FTP with better robustness."""
        if not self.host:
             return []
        
        def _ftp_list():
            programs = []
            try:
                # Explicitly use longer timeout for VM/slow networks
                ftp = ftplib.FTP(timeout=5.0)
                ftp.connect(self.host, 21)
                ftp.login(self.ftp_user, self.ftp_password)
                ftp.set_pasv(True) # Force passive mode
                
                # List of potential directories where programs might be stored
                search_dirs = ["/programs", "/root/programs", "/home/root/programs", "/"]
                
                for target_dir in search_dirs:
                    try:
                        print(f"[RobotClient] FTP: Trying directory '{target_dir}'")
                        ftp.cwd(target_dir)
                        # Use nlst() to get just filenames
                        files = ftp.nlst()
                        program_files = [f for f in files if f.endswith('.urp')]
                        if program_files:
                            print(f"[RobotClient] FTP: Found {len(program_files)} programs in '{target_dir}'")
                            # We keep the names and later we might need to handle full paths if they are nested
                            # but usually URSim keeps them flat in the target dir
                            programs.extend(program_files)
                    except Exception as e:
                        print(f"[RobotClient] FTP: Failed to list '{target_dir}': {e}")
                        continue
                
                # Remove duplicates if any
                programs = list(set(programs))
                ftp.quit()
            except Exception as e:
                print(f"[RobotClient] FTP global operations failed: {e}")
            return sorted(programs)

        return await asyncio.to_thread(_ftp_list)

    async def load_program(self, program_name: str) -> bool:
        """Load a program via Dashboard server."""
        if not self.dashboard_connected:
            return False
        
        # If the program name is just a filename, but we found it in a specific dir, 
        # we might need to load by path. For now, assume simple load.
        result = await self.send_dashboard_command(f"load {program_name}")
        return result is not None and ("Loading" in result or "Loaded" in result)

    async def play_program(self) -> bool:
        """Start or Resume loaded program via Dashboard server."""
        if not self.dashboard_connected:
            return False
        result = await self.send_dashboard_command("play")
        return result is not None and ("Starting" in result or "Playing" in result)

    async def pause_program(self) -> bool:
        """Pause program via Dashboard server."""
        if not self.dashboard_connected:
            return False
        result = await self.send_dashboard_command("pause")
        return result is not None and ("Pausing" in result or "Paused" in result)

    async def stop_program(self) -> bool:
        """Stop program via Dashboard server."""
        if not self.dashboard_connected:
            return False
        result = await self.send_dashboard_command("stop")
        return result is not None and ("Stopped" in result or "Stopping" in result)


# Global robot client instance
robot_client = RobotTCPClient()
