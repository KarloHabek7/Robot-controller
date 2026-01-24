// API Service for UR5 Robot Control
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || `${window.location.protocol}//${window.location.hostname}:8000`;

// Token management
export const getToken = (): string | null => {
    return localStorage.getItem('access_token');
};

export const setToken = (token: string): void => {
    localStorage.setItem('access_token', token);
};

export const removeToken = (): void => {
    localStorage.removeItem('access_token');
};

// API Client with automatic token injection
class ApiClient {
    private baseURL: string;
    private socket: WebSocket | null = null;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    subscribeToRobotState(onStateUpdate: (state: any) => void) {
        if (this.socket) {
            this.socket.close();
        }

        const wsBase = this.baseURL.replace('http', 'ws');
        const wsUrl = wsBase + '/api/robot/ws';
        console.log('[ApiClient] Connecting to WebSocket:', wsUrl);
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

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = getToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '69420',
            ...(options.headers || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Auth endpoints
    async register(username: string, email: string, password: string) {
        return this.request<{ access_token: string; token_type: string }>(
            '/api/auth/register',
            {
                method: 'POST',
                body: JSON.stringify({ username, email, password }),
            }
        );
    }

    async login(username: string, password: string) {
        // OAuth2 password flow expects form data
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${this.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'ngrok-skip-browser-warning': '69420',
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(error.detail || 'Invalid credentials');
        }

        return response.json();
    }

    async getCurrentUser() {
        return this.request<{ username: string; email: string; id: number }>(
            '/api/auth/me'
        );
    }

    // Robot connection endpoints
    async connectRobot(host: string, port: number) {
        return this.request<{ success: boolean; message: string }>(
            '/api/robot/connect',
            {
                method: 'POST',
                body: JSON.stringify({ host, port }),
            }
        );
    }

    async disconnectRobot() {
        return this.request<{ success: boolean; message: string }>(
            '/api/robot/disconnect',
            {
                method: 'POST',
            }
        );
    }

    async getRobotStatus() {
        return this.request<{ connected: boolean; host: string; port: number; speed_control_supported: boolean }>(
            '/api/robot/status'
        );
    }

    // Robot control endpoints
    async tcpTranslate(axis: string, value: number, direction: string) {
        return this.request<{ success: boolean; command: string; timestamp: string }>(
            '/api/robot/tcp/translate',
            {
                method: 'POST',
                body: JSON.stringify({ axis, value, direction }),
            }
        );
    }

    async tcpRotate(axis: string, value: number, direction: string) {
        return this.request<{ success: boolean; command: string; timestamp: string }>(
            '/api/robot/tcp/rotate',
            {
                method: 'POST',
                body: JSON.stringify({ axis, value, direction }),
            }
        );
    }

    async jointMove(joint: number, value: number, direction: string) {
        return this.request<{ success: boolean; command: string; timestamp: string }>(
            '/api/robot/joint/move',
            {
                method: 'POST',
                body: JSON.stringify({ joint, value, direction }),
            }
        );
    }

    async startProgram(programName: string) {
        return this.request<{ success: boolean; command: string; timestamp: string }>(
            '/api/robot/program/start',
            {
                method: 'POST',
                body: JSON.stringify({ program_name: programName }),
            }
        );
    }

    async stopProgram() {
        return this.request<{ success: boolean; command: string; timestamp: string }>(
            '/api/robot/program/stop',
            {
                method: 'POST',
            }
        );
    }

    async emergencyStop() {
        return this.request<{ success: boolean; command: string; timestamp: string }>(
            '/api/robot/emergency-stop',
            {
                method: 'POST',
                body: JSON.stringify({})
            }
        );
    }

    async moveToTargetJoints(joints: number[], speed: number = 0.5, acceleration: number = 0.5) {
        return this.request<{ success: boolean; command: string; timestamp: string }>(
            '/api/robot/move-to-joints',
            {
                method: 'POST',
                body: JSON.stringify({ joints, speed, acceleration }),
            }
        );
    }

    async moveToTargetTcp(pose: number[], speed: number = 100, acceleration: number = 100) {
        return this.request<{ success: boolean; command: string; timestamp: string }>(
            '/api/robot/move-to-tcp',
            {
                method: 'POST',
                body: JSON.stringify({ pose, speed, acceleration }),
            }
        );
    }

    async setRobotSpeed(speed: number) {
        return this.request<{ success: boolean; command: string; timestamp: string }>(
            '/api/robot/speed',
            {
                method: 'POST',
                body: JSON.stringify({ speed }),
            }
        );
    }
}

export const api = new ApiClient(API_BASE_URL);
