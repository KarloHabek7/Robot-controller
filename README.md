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
5. Start the Vite dev server (port 5173)

## Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Project Structure

```
/
├── backend/          # FastAPI application
│   ├── api/          # API routes
│   ├── main.py       # Entry point
│   ├── database.py   # DB configuration
│   ├── models.py     # SQLModel models
│   ├── auth.py       # JWT authentication
│   └── robot_client.py  # UR5 TCP client
├── frontend/         # React application
├── run.py            # Orchestration script
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
