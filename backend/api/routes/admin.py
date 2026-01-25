from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

from backend.database import get_session
from backend.models import User
from backend.api.routes.auth import UserResponse
from backend.deps import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])

def get_current_superuser(current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

@router.get("/users", response_model=List[UserResponse])
def get_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_superuser)
):
    users = session.exec(select(User)).all()
    return users

@router.post("/users/{user_id}/approve", response_model=UserResponse)
def approve_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_superuser)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_approved = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.post("/users/{user_id}/revoke", response_model=UserResponse)
def revoke_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_superuser)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_approved = False
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.delete("/users/{user_id}", response_model=UserResponse)
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_superuser)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
         raise HTTPException(status_code=400, detail="Cannot delete your own account")

    session.delete(user)
    session.commit()
    return user
