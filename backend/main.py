from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.database import create_db_and_tables
from backend.api.routes import auth, robot

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[Backend] Creating database tables...")
    create_db_and_tables()
    yield
    # Shutdown
    print("[Backend] Shutting down...")

app = FastAPI(title="UR5 Robot Controller", lifespan=lifespan)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(robot.router)

@app.get("/")
def read_root():
    return {"message": "UR5 Controller API is running"}

