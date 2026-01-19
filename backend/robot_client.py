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
        self.feedback_task: Optional[asyncio.Task] = None
        self.dashboard_reader: Optional[asyncio.StreamReader] = None
        self.dashboard_writer: Optional[asyncio.StreamWriter] = None
        self.dashboard_connected = False
        self.robot_model: str = "UR5"  # Default

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

            # Dashboard connection (29999)
            try:
                self.dashboard_reader, self.dashboard_writer = await asyncio.open_connection(host, 29999)
                self.dashboard_connected = True
                print(f"[RobotClient] Dashboard connected to {host}:29999")
                
                # Query model
                await self._detect_model()
            except Exception as de:
                print(f"[RobotClient] Dashboard connection failed: {de}")
                self.dashboard_connected = False

            self.host = host
            self.port = port
            print(f"[RobotClient] Connected to {host}:{port} (Model: {self.robot_model})")

            # Start feedback listener task
            if self.feedback_connected:
                self.feedback_task = asyncio.create_task(self._feedback_listener())

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

        if self.writer:
            self.writer.close()
            await self.writer.wait_closed()
        if self.feedback_writer:
            self.feedback_writer.close()
            await self.feedback_writer.wait_closed()
        if self.dashboard_writer:
            self.dashboard_writer.close()
            await self.dashboard_writer.wait_closed()
        self.connected = False
        self.feedback_connected = False
        self.dashboard_connected = False
        self.reader = None
        self.writer = None
        self.feedback_reader = None
        self.feedback_writer = None
        self.dashboard_reader = None
        self.dashboard_writer = None
        self.latest_state = None
        self.robot_model = "UR5"
        print("[RobotClient] Disconnected")

    async def send_command(self, urscript: str) -> bool:
        """Send a URScript command to the robot."""
        if not self.connected or not self.writer:
            print("[RobotClient] Not connected to robot")
            return False
        
        try:
            command = urscript + "\n"
            self.writer.write(command.encode())
            await self.writer.drain()
            print(f"[RobotClient] Sent command: {urscript[:50]}...")
            return True
        except Exception as e:
            print(f"[RobotClient] Failed to send command: {e}")
            self.connected = False
            return False

    def is_connected(self) -> bool:
        return self.connected

    async def read_state(self) -> Optional[dict]:
        """Return the latest parsed robot state."""
        if self.latest_state:
            state_copy = self.latest_state.copy()
            state_copy["model"] = self.robot_model
            # Also copy lists to avoid in-place modification of joint/tcp data
            state_copy["joints"] = list(state_copy["joints"])
            state_copy["tcp_pose"] = list(state_copy["tcp_pose"])
            return state_copy
        return None

    async def _detect_model(self):
        """Query the dashboard server for the robot model."""
        if not self.dashboard_connected or not self.dashboard_writer or not self.dashboard_reader:
            return

        try:
            # First consume any initial greeting
            try:
                await asyncio.wait_for(self.dashboard_reader.readline(), timeout=1.0)
            except:
                pass

            # Send 'robotmode' or wait for connection message which often contains the model
            # Actually, "get robot model" is not a standard dashboard command in all versions, 
            # but sometimes the version message contains it.
            # Let's try to get the model via joint limits or just a common way.
            # Standard dashboard 'polyscopeVersion' can also help.
            self.dashboard_writer.write(b"robotmode\n")
            await self.dashboard_writer.drain()
            resp = await asyncio.wait_for(self.dashboard_reader.readline(), timeout=2.0)
            print(f"[RobotClient] Dashboard robotmode response: {resp.decode().strip()}")
            
            # If that doesn't give it, try to infer from RTDE or just use a default if it's URSim
            # For simplicity in this demo, we'll try to find common model names in responses
            self.dashboard_writer.write(b"get robot model\n")
            await self.dashboard_writer.drain()
            resp = await asyncio.wait_for(self.dashboard_reader.readline(), timeout=2.0)
            model_info = resp.decode().strip()
            print(f"[RobotClient] Dashboard model response: {model_info}")
            
            for m in ["UR3", "UR5", "UR10", "UR16"]:
                if m in model_info.upper():
                    self.robot_model = m
                    if "E-SERIES" in model_info.upper() or "E" in model_info.upper().split()[-1]:
                         self.robot_model += "e"
                    break
        except Exception as e:
            print(f"[RobotClient] Failed to detect robot model: {e}")
            self.robot_model = "UR5" # Default if detection fails

    async def _feedback_listener(self):
        """Background task that continuously reads and parses robot state."""
        print("[RobotClient] Starting feedback listener")
        while self.feedback_connected and self.feedback_reader:
            try:
                # Read packet length (first 4 bytes)
                header = await self.feedback_reader.readexactly(4)
                length = struct.unpack('!i', header)[0]
                
                # Consume the rest of the packet
                data = header + await self.feedback_reader.readexactly(length - 4)
                
                if length >= 444 + 48:
                    # Unpack joint positions (actual_q) - 6 doubles starting at offset 252
                    q_actual = struct.unpack('!6d', data[252:252+48])
                    
                    # Unpack TCP pose (actual_TCP_pose) - 6 doubles starting at offset 444
                    tcp_actual = struct.unpack('!6d', data[444:444+48])
                    
                    self.latest_state = {
                        "joints": list(q_actual),
                        "tcp_pose": list(tcp_actual),
                        "timestamp": datetime.now().isoformat()
                    }
                
                # Yield control to other tasks
                await asyncio.sleep(0) # Immediate yield

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[RobotClient] Feedback listener error: {e}")
                # Don't break on everything, maybe it's just a read error
                await asyncio.sleep(1)
        print("[RobotClient] Feedback listener stopped")


# Global robot client instance
robot_client = RobotTCPClient()
