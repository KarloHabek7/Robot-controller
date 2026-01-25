# UR5 Robot Control System

Advanced robot control interface for Universal Robots (UR5/UR10) with real-time 3D coordinate tracking and precision movement commands.

## Features

- **Real-time Monitoring**: Track robot position and orientation in 3D.
- **Precision Control**: Move the robot via Joint or TCP coordinates with adjustable increments.
- **Program Management**: Select and run programs directly from the interface.
- **Industrial Design**: High-performance, low-latency dashboard with dark/light mode support.
- **Secure Access**: Integrated authentication system.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python (FastAPI/Flask) - Integrated via the main `run.py`
- **3D Visualization**: Three.js / React Three Fiber
- **Icons**: Lucide React & Custom Robot Branding

## Getting Started

### Prerequisites

- Node.js & npm
- Python 3.10+

### Installation & Development

1. **Backend Setup**:
   Ensure your Python environment is set up and dependencies are installed.
   ```ps1
   python run.py
   ```

2. **Frontend Setup**:
   Navigate to the `frontend` directory:
   ```sh
   cd frontend
   npm install
   npm run dev
   ```

## Deployment

The application is designed to be served from a local industrial workstation connected to the robot network.
