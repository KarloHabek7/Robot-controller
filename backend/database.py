from sqlmodel import Field, SQLModel, Session, create_engine, select
from typing import Optional
import os

DATABASE_URL = "sqlite:///./database.db"

engine = create_engine(DATABASE_URL, echo=False)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
