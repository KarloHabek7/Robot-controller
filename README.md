# UR5 Robot Control System

A production-grade web-based control system for Universal Robots (UR5).

## Architecture

- **Backend**: Python FastAPI with SQLModel/SQLite
- **Frontend**: React + Vite + TypeScript
- **Database**: SQLite (local)
- **Authentication**: JWT-based

## Quick Start

```bash
python run.py
```

This will:
1. Create a Python virtual environment
2. Install backend dependencies
3. Install frontend dependencies
4. Start the FastAPI backend (port 8000)
5. Start the Vite dev server (port 8080)

## Access
### Local & Network (Recommended for development)
To access the app on your local network/wifi without any internet connection:
1. Set `TUNNEL_PROVIDER=none` in `.env`.
2. Run `python run.py`.
3. Scan the QR code printed in the terminal or use the `http://192.168.x.x:8080` link.

### Remote Access (HTTPS)
To enable secure remote access from anywhere using **Cloudflare Tunnel**:

1. Download [cloudflared](https://github.com/cloudflare/cloudflared/releases) and place `cloudflared.exe` in the root folder.
2. Set `TUNNEL_PROVIDER=cloudflare` in `.env`.
3. Run `python run.py`.
4. Scan the QR code or use the `https://....trycloudflare.com` link.

## Project Structure

```
/
├── backend/            # FastAPI application
│   ├── api/            # API routes
│   ├── main.py         # Entry point
│   ├── database.py     # DB configuration
│   ├── models.py       # SQLModel models
│   ├── auth.py         # JWT authentication
│   └── robot_client.py # UR5 TCP client
├── frontend/           # React application
├── run.py              # Orchestration script
└── README.md
```

## Features

- User authentication (register/login)
- Robot connection management (configurable IP/Port)
- Joint control
- TCP (Cartesian) control
- Program execution
- Emergency stop
- Activity logging

## Development

### Backend only
```bash
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uvicorn backend.main:app --reload
```

### Frontend only
```bash
cd frontend
npm run dev
```
