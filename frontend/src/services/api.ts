// API Service for UR5 Robot Control
const API_BASE_URL = 'http://localhost:8000';

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

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = getToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
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
        return this.request<{ connected: boolean; host: string; port: number }>(
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
            }
        );
    }
}

export const api = new ApiClient(API_BASE_URL);
