
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db import database
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_users_collection():
    if database.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not connected.",
        )

    return database.db["users"]


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(request: RegisterRequest):
    users = get_users_collection()

    email = str(request.email).strip().lower()
    name = request.name.strip()

    user = {
        "name": name,
        "email": email,
        "hashed_password": hash_password(request.password),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user_id = str(result.inserted_id)

    return AuthResponse(
        access_token=create_access_token(user_id),
        user=UserResponse(
            id=user_id,
            name=name,
            email=email,
        ),
    )


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest):
    users = get_users_collection()
    email = str(request.email).strip().lower()

    user = users.find_one({"email": email})

    if not user or not verify_password(
        request.password,
        user["hashed_password"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user_id = str(user["_id"])

    return AuthResponse(
        access_token=create_access_token(user_id),
        user=UserResponse(
            id=user_id,
            name=user["name"],
            email=user["email"],
        ),
    )
