// Smart API URL selection:
const isLocalNetwork =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.');

const API_BASE_URL = isLocalNetwork
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : (import.meta.env.VITE_API_BASE_URL as string) || `${window.location.protocol}//${window.location.hostname}:8000`;

interface LoginCredentials {
    username: string;
    password: string;
}

interface RegisterData {
    username: string;
    email: string;
    password: string;
}

interface ConnectRequest {
    host: string;
    port: number;
}

interface CommandRequest {
    axis: string;
    value: number;
    direction: string;
}

interface JointMoveRequest {
    joint: number;
    value: number;
    direction: string;
}

interface ProgramRequest {
    program_name: string;
}

class ApiClient {
    private token: string | null = null;

    constructor() {
        this.token = localStorage.getItem("access_token");
    }

    setToken(token: string) {
        this.token = token;
        localStorage.setItem("access_token", token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem("access_token");
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = this.token; // Use locally cached token
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "69420",
            ...options.headers,
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const label = `API Request ${endpoint}`;
        console.time(label);
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: "Unknown error" }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }

            return response.json();
        } finally {
            console.timeEnd(label);
        }
    }

    // Auth endpoints
    async register(data: RegisterData) {
        return this.request("/api/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async login(credentials: LoginCredentials) {
        const formData = new URLSearchParams();
        formData.append("username", credentials.username);
        formData.append("password", credentials.password);

        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "ngrok-skip-browser-warning": "69420",
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: "Login failed" }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        const data = await response.json();
        this.setToken(data.access_token);
        return data;
    }

    async getCurrentUser() {
        return this.request("/api/auth/me");
    }

    // Robot endpoints
    async connectRobot(data: ConnectRequest) {
        return this.request("/api/robot/connect", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async disconnectRobot() {
        return this.request("/api/robot/disconnect", {
            method: "POST",
        });
    }

    async getRobotStatus() {
        return this.request("/api/robot/status");
    }

    async tcpTranslate(data: CommandRequest) {
        return this.request("/api/robot/tcp/translate", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async tcpRotate(data: CommandRequest) {
        return this.request("/api/robot/tcp/rotate", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async jointMove(data: JointMoveRequest) {
        return this.request("/api/robot/joint/move", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async startProgram(data: ProgramRequest) {
        return this.request("/api/robot/program/start", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async stopProgram() {
        return this.request("/api/robot/program/stop", {
            method: "POST",
        });
    }

    async emergencyStop() {
        return this.request("/api/robot/emergency-stop", {
            method: "POST",
        });
    }

    async sendRawCommand(command: string) {
        return this.request("/api/robot/command/raw", {
            method: "POST",
            body: JSON.stringify({ command }),
        });
    }
}

export const api = new ApiClient();
