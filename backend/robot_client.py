import asyncio
import socket
from typing import Optional
from datetime import datetime


class RobotTCPClient:
    def __init__(self):
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.connected = False
        self.host: Optional[str] = None
        self.port: Optional[int] = None

    async def connect(self, host: str, port: int) -> bool:
        """Connect to the UR5 robot controller."""
        try:
            self.reader, self.writer = await asyncio.open_connection(host, port)
            self.connected = True
            self.host = host
            self.port = port
            print(f"[RobotClient] Connected to {host}:{port}")
            return True
        except Exception as e:
            print(f"[RobotClient] Connection failed: {e}")
            self.connected = False
            return False

    async def disconnect(self):
        """Disconnect from the robot."""
        if self.writer:
            self.writer.close()
            await self.writer.wait_closed()
        self.connected = False
        self.reader = None
        self.writer = None
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


# Global robot client instance
robot_client = RobotTCPClient()
