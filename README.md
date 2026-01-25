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
### Local & Network
- **Frontend**: `https://localhost:8080` or `https://<YOUR_LOCAL_IP>:8080`
- **Backend API**: `https://localhost:8000`
- **API Docs**: `https://localhost:8000/docs`

> [!NOTE]
> When using local IP/localhost, you will see a certificate warning. Click **Advanced** -> **Proceed**. For a secure connection without warnings, use **ngrok**.

### Remote Access (Tunnels)
To enable secure remote access from anywhere (e.g., mobile devices), you can use a tunnel provider. Support for both **ngrok** and **localtunnel** is built-in.

Configure your preference in a `.env` file in the root directory:

#### Option 1: Localtunnel (Easiest, No account required)
Localtunnel is the default if no provider is specified.
```env
TUNNEL_PROVIDER=localtunnel
```
*Note: When first opening the URL, you may be asked for your "Tunnel Password", which is the **Public IP** of the machine running the server. You can find it at [whatismyip.com](https://www.whatismyip.com/).*

#### Option 2: ngrok (More stable, Requires account)
1. Create a free account at [ngrok.com](https://ngrok.com/).
2. Add your provider and authtoken to `.env`:
   ```env
   TUNNEL_PROVIDER=ngrok
   NGROK_AUTHTOKEN=your_token_here
   ```

#### Option 3: Local Only (No Tunnels)
If you only want to access the app on your local network/wifi:
```env
TUNNEL_PROVIDER=none
```

3. Run `python run.py`. 
4. Use the public URLs printed in the console.

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
