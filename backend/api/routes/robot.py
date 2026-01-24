from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
import asyncio
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from backend.robot_client import robot_client
from backend.deps import get_current_user
from backend.models import User, ActivityLog
from backend.database import get_session
from sqlmodel import Session
import json
import math
from fastapi.concurrency import run_in_threadpool

router = APIRouter(prefix="/api/robot", tags=["Robot Control"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.broadcast_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        if not self.broadcast_task or self.broadcast_task.done():
            self.broadcast_task = asyncio.create_task(self.broadcast_robot_state())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

    async def broadcast_robot_state(self):
        print("[RobotWS] Starting state broadcast task")
        while self.active_connections:
            if robot_client.is_connected():
                state = await robot_client.read_state()
                if state:
                    # Convert radians to degrees for frontend convenience
                    state["joints"] = [math.degrees(q) for q in state["joints"]]
                    await self.broadcast(json.dumps(state))
            await asyncio.sleep(0.1) # 10Hz update rate
        print("[RobotWS] Stopping state broadcast task")

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_robot_state(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

class ConnectRequest(BaseModel):
    host: str
    port: int

class ConnectResponse(BaseModel):
    success: bool
    message: str

class CommandRequest(BaseModel):
    axis: str
    value: float
    direction: str

class RobotStatus(BaseModel):
    connected: bool
    host: Optional[str] = None
    port: Optional[int] = None
    speed_control_supported: bool = False  # True if RTDE is available

class JointMoveRequest(BaseModel):
    joint: int
    value: float
    direction: str

class ProgramRequest(BaseModel):
    program_name: str

class CommandResponse(BaseModel):
    success: bool
    command: str
    timestamp: str

class MoveToJointsRequest(BaseModel):
    joints: list[float]
    speed: float = 0.5
    acceleration: float = 0.5

class MoveToTcpRequest(BaseModel):
    pose: list[float]
    speed: float = 0.1  # m/s
    acceleration: float = 0.5  # m/s^2

class SetSpeedRequest(BaseModel):
    speed: float  # 0.0 to 1.0

@router.post("/connect", response_model=ConnectResponse)
async def connect_robot(
    request: ConnectRequest,
    current_user: User = Depends(get_current_user)
):
    success = await robot_client.connect(request.host, request.port)
    if success:
        return ConnectResponse(success=True, message="Connected to robot")
    else:
        raise HTTPException(status_code=500, detail="Failed to connect to robot")

@router.post("/disconnect")
async def disconnect_robot(current_user: User = Depends(get_current_user)):
    await robot_client.disconnect()
    return {"success": True, "message": "Disconnected from robot"}

@router.get("/status", response_model=RobotStatus)
async def get_status():
    return RobotStatus(
        connected=robot_client.is_connected(),
        host=robot_client.host,
        port=robot_client.port,
        speed_control_supported=robot_client.rtde_connected
    )

def generate_translation_script(axis: str, value: float, direction: str) -> str:
    axis_index = {"x": 0, "y": 1, "z": 2}[axis.lower()]
    sign = "+" if direction == "+" else "-"
    func_name = f"program_{axis}_{'pos' if direction == '+' else 'neg'}"
    
    # value is in mm from frontend, convert to meters for URScript
    m_value = value / 1000.0
    
    return f"""
def {func_name}():
  poz_tcp=get_actual_tcp_pose()
  poz_tcp2=poz_tcp
  poz_tcp2[{axis_index}]=poz_tcp2[{axis_index}]{sign}{m_value}
  movel(poz_tcp2,a=1,v=1,t=0,r=0)
end
"""

def generate_rotation_script(axis: str, value: float, direction: str) -> str:
    axis_index = {"rx": 3, "ry": 4, "rz": 5}[axis.lower()]
    sign = "+" if direction == "+" else "-"
    func_name = f"program_{axis}_{'pos' if direction == '+' else 'neg'}"
    
    # value is in degrees from frontend, convert to radians for URScript
    rad_value = math.radians(value)
    
    return f"""
def {func_name}():
  poz_tcp=get_actual_tcp_pose()
  poz_tcp2=poz_tcp
  poz_tcp2[{axis_index}]=poz_tcp2[{axis_index}]{sign}{rad_value}
  movel(poz_tcp2,a=1,v=1,t=0,r=0)
end
"""

def generate_joint_move_script(joint: int, value: float, direction: str) -> str:
    joint_index = joint - 1
    sign = "+" if direction == "+" else "-"
    func_name = f"program_z{joint}_{'pos' if direction == '+' else 'neg'}"
    
    # value is in degrees from frontend, convert to radians for URScript
    rad_value = math.radians(value)
    
    return f"""
def {func_name}():
  poz_zgl=get_actual_joint_positions()
  poz_zgl2=poz_zgl
  poz_zgl2[{joint_index}]=poz_zgl2[{joint_index}]{sign}{rad_value}
  movej(poz_zgl2,a=1,v=1,t=0,r=0)
end
"""

# Changed to sync function to be run in threadpool
def log_command(user_id: int, command: str, success: bool, session: Session):
    log = ActivityLog(user_id=user_id, command=command, success=success)
    session.add(log)
    session.commit()

@router.post("/tcp/translate", response_model=CommandResponse)
async def tcp_translate(
    request: CommandRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    script = generate_translation_script(request.axis, request.value, request.direction)
    success = await robot_client.send_command(script)
    
    await run_in_threadpool(log_command, current_user.id, f"TCP Translate {request.axis} {request.direction}{request.value}", success, session)
    
    if success:
        return CommandResponse(success=True, command=script, timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")

@router.post("/tcp/rotate", response_model=CommandResponse)
async def tcp_rotate(
    request: CommandRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    script = generate_rotation_script(request.axis, request.value, request.direction)
    success = await robot_client.send_command(script)
    
    await run_in_threadpool(log_command, current_user.id, f"TCP Rotate {request.axis} {request.direction}{request.value}", success, session)
    
    if success:
        return CommandResponse(success=True, command=script, timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")

@router.post("/joint/move", response_model=CommandResponse)
async def joint_move(
    request: JointMoveRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    script = generate_joint_move_script(request.joint, request.value, request.direction)
    success = await robot_client.send_command(script)
    
    await run_in_threadpool(log_command, current_user.id, f"Joint {request.joint} Move {request.direction}{request.value}", success, session)
    
    if success:
        return CommandResponse(success=True, command=script, timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")

@router.post("/program/start", response_model=CommandResponse)
async def start_program(
    request: ProgramRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    script = f"def {request.program_name}():\n  # Program code goes here\nend"
    success = await robot_client.send_command(script)
    
    await run_in_threadpool(log_command, current_user.id, f"Start Program {request.program_name}", success, session)
    
    if success:
        return CommandResponse(success=True, command=script, timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")

@router.post("/program/stop", response_model=CommandResponse)
async def stop_program(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    script = "stop"
    success = await robot_client.send_command(script)
    
    await run_in_threadpool(log_command, current_user.id, "Stop Program", success, session)
    
    if success:
        return CommandResponse(success=True, command=script, timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")

@router.post("/emergency-stop", response_model=CommandResponse)
async def emergency_stop(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Send script stop
    script = "stopj(10)"
    script_success = await robot_client.send_command(script)
    
    # Also send Dashboard stop for UI visual feedback on controller
    dash_success = await robot_client.send_dashboard_command("stop")
    
    success = script_success or dash_success
    
    await run_in_threadpool(log_command, current_user.id, "Emergency Stop", success, session)
    
    if success:
        return CommandResponse(success=True, command=f"{script} + Dashboard Stop", timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")

@router.post("/speed", response_model=CommandResponse)
async def set_speed(
    request: SetSpeedRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # s must be between 0 and 1
    s = max(0.0, min(1.0, request.speed))
    
    # Use the smart setter that tries RTDE then Dashboard
    success = await robot_client.set_robot_speed(s)
    method = "Interface (RTDE/Dashboard)" if success else "Script Fallback"
    
    if not success:
        # Final fallback to script if both industrial interfaces failed
        script = f"set_speed_slider_fraction({s})"
        success = await robot_client.send_command(script)
    
    await run_in_threadpool(log_command, current_user.id, f"Set Speed Slider ({method}) to {s*100}%", success, session)
    
    if success:
        return CommandResponse(success=True, command=f"Speed set via {method}", timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")

@router.post("/move-to-joints", response_model=CommandResponse)
async def move_to_joints(
    request: MoveToJointsRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Convert degrees to radians (frontend sends degrees)
    joints_rad = [math.radians(j) for j in request.joints]
    
    # Generate movej command
    # movej(q, a=1.4, v=1.05, t=0, r=0)
    script = f"movej([{','.join(map(str, joints_rad))}], a={request.acceleration}, v={request.speed})"
    
    success = await robot_client.send_command(script)
    await run_in_threadpool(log_command, current_user.id, f"Move to Joints: {request.joints}", success, session)
    
    if success:
        return CommandResponse(success=True, command=script, timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")

@router.post("/move-to-tcp", response_model=CommandResponse)
async def move_to_tcp(
    request: MoveToTcpRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Pose is already in meters and radians from frontend
    x, y, z, rx, ry, rz = request.pose
    
    # Generate movel command
    # movel(pose, a=1.2, v=0.25, t=0, r=0)
    script = f"movel(p[{x},{y},{z},{rx},{ry},{rz}], a={request.acceleration}, v={request.speed})"
    
    success = await robot_client.send_command(script)
    await run_in_threadpool(log_command, current_user.id, f"Move to TCP: {request.pose}", success, session)
    
    if success:
        return CommandResponse(success=True, command=script, timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")

class RawCommandRequest(BaseModel):
    command: str

@router.post("/command/raw", response_model=CommandResponse)
async def send_raw_command(
    request: RawCommandRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    success = await robot_client.send_command(request.command)
    
    await run_in_threadpool(log_command, current_user.id, f"Raw: {request.command[:50]}", success, session)
    
    if success:
        return CommandResponse(success=True, command=request.command, timestamp=datetime.utcnow().isoformat())
    else:
        raise HTTPException(status_code=500, detail="Not connected to robot")
