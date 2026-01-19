const API_BASE_URL = 'http://localhost:3001/api';

export interface TranslateRequest {
  axis: 'x' | 'y' | 'z';
  value: number;
  direction: '+' | '-';
}

export interface RotateRequest {
  axis: 'rx' | 'ry' | 'rz';
  value: number;
  direction: '+' | '-';
}

export interface JointMoveRequest {
  joint: number;
  value: number;
  direction: '+' | '-';
}

export interface ConnectRequest {
  host: string;
  port: number;
}

export interface StartProgramRequest {
  programName: string;
}

class URRobotService {
  private socket: WebSocket | null = null;

  subscribeToRobotState(onStateUpdate: (state: any) => void) {
    if (this.socket) {
      this.socket.close();
    }

    const wsUrl = API_BASE_URL.replace('http', 'ws') + '/robot/ws';
    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onStateUpdate(data);
      } catch (error) {
        console.error('Error parsing robot state:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('Robot state WebSocket closed');
      this.socket = null;
    };

    this.socket.onerror = (error) => {
      console.error('Robot state WebSocket error:', error);
    };
  }

  unsubscribeFromRobotState() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  async connect(host: string, port: number = 30002): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port }),
      });

      if (!response.ok) throw new Error('Connection failed');
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }

  async translateTCP(request: TranslateRequest): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/tcp/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('Translation failed');
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  async rotateTCP(request: RotateRequest): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/tcp/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('Rotation failed');
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Rotation error:', error);
      throw error;
    }
  }

  async moveJoint(request: JointMoveRequest): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/joint/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('Joint move failed');
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Joint move error:', error);
      throw error;
    }
  }

  async startProgram(programName: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/program/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programName }),
      });

      if (!response.ok) throw new Error('Program start failed');
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Program start error:', error);
      throw error;
    }
  }

  async stopProgram(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/program/stop`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Program stop failed');
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Program stop error:', error);
      throw error;
    }
  }

  async emergencyStop(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-stop`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Emergency stop failed');
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Emergency stop error:', error);
      throw error;
    }
  }
}

export const urRobotService = new URRobotService();
