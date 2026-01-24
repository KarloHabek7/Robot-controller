import asyncio
import socket
import struct
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
        """Connect to the UR5 robot controller."""
        try:
            # Command connection (usually 30002)
            self.reader, self.writer = await asyncio.open_connection(host, port)
            self.connected = True
            
            # Feedback connection (always 30003 for real-time)
            try:
                self.feedback_reader, self.feedback_writer = await asyncio.open_connection(host, 30003)
                self.feedback_connected = True
                print(f"[RobotClient] Feedback connected to {host}:30003")
            except Exception as fe:
                print(f"[RobotClient] Feedback connection failed: {fe}")
                self.feedback_connected = False

            # Dashboard connection (always 29999)
            try:
                self.dashboard_reader, self.dashboard_writer = await asyncio.open_connection(host, 29999)
                self.dashboard_connected = True
                print(f"[RobotClient] Dashboard connected to {host}:29999")
            except Exception as de:
                print(f"[RobotClient] Dashboard connection failed: {de}")
                self.dashboard_connected = False

            # RTDE connection (Port 30004)
            try:
                self.rtde_reader, self.rtde_writer = await asyncio.open_connection(host, 30004)
                if await self._rtde_handshake():
                    self.rtde_connected = True
                    print(f"[RobotClient] RTDE connected and synchronized on {host}:30004")
                else:
                    print("[RobotClient] RTDE handshake failed")
                    self.rtde_connected = False
            except Exception as re:
                print(f"[RobotClient] RTDE connection failed: {re}")
                self.rtde_connected = False

            self.host = host
            self.port = port
            print(f"[RobotClient] Connected to {host}:{port}")

            # Start feedback listener task
            if self.feedback_connected:
                self.feedback_task = asyncio.create_task(self._feedback_listener())

            if self.rtde_connected:
                self.rtde_task = asyncio.create_task(self._rtde_listener())
            else:
                print("[RobotClient] RTDE not connected, speed control will use script fallback")

            return True
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
            # Wrap in a secondary program for better execution on port 30002
            if "def " not in urscript:
                command = f"def secondary_program():\n  {urscript}\nend\n"
            else:
                command = urscript
                if not command.endswith("\n"):
                    command += "\n"
                    
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
            print("[RobotClient] Dashboard not connected")
            return None
        
        try:
            cmd = command.strip() + "\n"
            self.dashboard_writer.write(cmd.encode())
            await self.dashboard_writer.drain()
            
            # Dashboard server always responds with a status message ending in \n
            response = await self.dashboard_reader.readuntil(b'\n')
            resp_text = response.decode().strip()
            print(f"[RobotClient] Dashboard command: '{command}' -> Result: '{resp_text}'")
            return resp_text
        except Exception as e:
            print(f"[RobotClient] Dashboard command failed: {e}")
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
                if res_type == self.RTDE_TEXT_MESSAGE:
                    msg = res_data[1:].decode(errors='ignore')
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
                    if res_type == self.RTDE_TEXT_MESSAGE:
                        msg = res_data[1:].decode(errors='ignore')
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

            # 2. Setup Outputs (speed_scaling)
            output_vars = "speed_scaling,target_speed_fraction"
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
        header = await self.rtde_reader.readexactly(3)
        length, p_type = struct.unpack(">HB", header)
        payload = await self.rtde_reader.readexactly(length - 3)
        return length, p_type, payload

    async def _rtde_listener(self):
        """Background task to read RTDE data packages."""
        print("[RobotClient] Starting RTDE listener")
        while self.rtde_connected and self.rtde_reader:
            try:
                length, p_type, data = await self._read_rtde_package()
                if p_type == self.RTDE_DATA_PACKAGE:
                    recipe_id = data[0]
                    if recipe_id == self.rtde_output_recipe_id:
                        # Output recipe: 2 doubles (speed_scaling, target_speed_fraction)
                        # Use the max of them to be safe (unaligned buffers sometimes have zeros)
                        vals = struct.unpack(">dd", data[1:])
                        self.rtde_speed_slider = max(vals[0], vals[1])
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
        """Set the speed slider using RTDE or Dashboard fallback."""
        # 1. Try RTDE if connected
        if self.rtde_connected:
            try:
                payload = struct.pack(">BId", self.rtde_input_recipe_id, 1, fraction)
                await self._send_rtde_package(self.RTDE_DATA_PACKAGE, payload)
                return True
            except Exception:
                self.rtde_connected = False

        # 2. Try Dashboard "set speed"
        if self.dashboard_connected:
            resp = await self.send_dashboard_command(f"set speed {fraction}")
            if resp and "set speed" in resp.lower():
                return True

        return False

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
                        # FALLBACK SCANNER: Try to find the speed slider in port 30003 packet
                        # We use 1.0 as initial fallback
                        speed_slider = 1.0
                        
                        # 1. Try cached offset if we found one before
                        if self._speed_offset_cache is not None:
                            speed_slider = struct.unpack('!d', data[self._speed_offset_cache:self._speed_offset_cache+8])[0]
                        else:
                            # 2. Brute force scan for anything between 0.05 and 1.0 (excluding joint offsets)
                            # Start scan after joints/tcp (offset 600+)
                            found_vals = []
                            for off in range(600, length - 8, 8):
                                v = struct.unpack('!d', data[off:off+8])[0]
                                # Look for common scale values (like 0.1, 0.25, 0.5, 0.75, 1.0)
                                # and exclude known non-slider fields if possible
                                if 0.01 < v <= 1.0:
                                    found_vals.append((off, v))
                            
                            if found_vals:
                                # Prioritize offsets around 940 or 1052
                                best_match = min(found_vals, key=lambda x: min(abs(x[0]-940), abs(x[0]-1052)))
                                speed_slider = best_match[1]
                                # If it's not 1.0, maybe cache it? For now just use it.
                                if packet_count % 250 == 0:
                                    print(f"[RobotClient] Speed Scanner Found: {', '.join([f'{o}:{v:.2f}' for o,v in found_vals[:4]])}")

                    self.latest_state = {
                        "joints": list(q_actual),
                        "tcp_pose": list(tcp_actual),
                        "speed_slider": speed_slider,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    if packet_count % 125 == 0:
                        mode = "RTDE" if self.rtde_connected else "SCAN"
                        print(f"[RobotClient] Update [{mode}]: Speed={speed_slider*100:.1f}%")
                
                await asyncio.sleep(0)
            except Exception as e:
                print(f"[RobotClient] Feedback loop error: {e}")
                await asyncio.sleep(1)
                
        self.feedback_connected = False
        print("[RobotClient] Feedback listener stopped")


# Global robot client instance
robot_client = RobotTCPClient()
