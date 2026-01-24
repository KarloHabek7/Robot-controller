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
        self.latest_state: Optional[dict] = None
        self.feedback_task: Optional[asyncio.Task] = None

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

            self.host = host
            self.port = port
            print(f"[RobotClient] Connected to {host}:{port}")

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
        self.connected = False
        self.feedback_connected = False
        self.reader = None
        self.writer = None
        self.feedback_reader = None
        self.feedback_writer = None
        self.latest_state = None
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
            return self.latest_state.copy()
        return None

    async def _feedback_listener(self):
        """Background task that continuously reads and parses robot state."""
        print("[RobotClient] Starting feedback listener")
        packet_count = 0
        while self.feedback_connected and self.feedback_reader:
            try:
                # Read packet length (first 4 bytes)
                header = await self.feedback_reader.readexactly(4)
                length = struct.unpack('!i', header)[0]
                
                # Consume the rest of the packet
                data = header + await self.feedback_reader.readexactly(length - 4)
                
                packet_count += 1
                
                # Process only every 5th packet (125Hz / 5 = 25Hz)
                # This drastically reduces CPU usage and frontend broadcast overhead
                if packet_count % 5 != 0:
                    await asyncio.sleep(0) # Yield for other tasks
                    continue

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
                    
                    if packet_count % 125 == 0: # Log every ~1 second (125Hz / 5 * 25 is still valid logic but simpler to just mod 125)
                         # Note: packet_count increments at 125Hz, so this is still once per second
                        print(f"[RobotClient] State updated. J1: {q_actual[0]:.2f}, TCPz: {tcp_actual[2]:.2f}")
                
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
