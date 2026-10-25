
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId

from app.main import app
from app.db import database


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_users():
    users = MagicMock()
    with patch.object(database, "db", {"users": users}):
        yield users


def test_register_success(client, mock_users):
    user_id = ObjectId()
    mock_users.insert_one.return_value.inserted_id = user_id

    with patch(
        "app.api.auth.hash_password",
        return_value="hashed_password",
    ), patch(
        "app.api.auth.create_access_token",
        return_value="test-token",
    ):
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Javeria Malik",
                "email": "Javeria@example.com",
                "password": "StrongPass123",
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["access_token"] == "test-token"
    assert data["user"]["email"] == "javeria@example.com"
    assert "hashed_password" not in data["user"]

    inserted_user = mock_users.insert_one.call_args.args[0]
    assert inserted_user["email"] == "javeria@example.com"
    assert inserted_user["hashed_password"] == "hashed_password"


def test_register_duplicate_email(client, mock_users):
    from pymongo.errors import DuplicateKeyError

    mock_users.insert_one.side_effect = DuplicateKeyError("duplicate")

    with patch(
        "app.api.auth.hash_password",
        return_value="hashed_password",
    ):
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Javeria Malik",
                "email": "javeria@example.com",
                "password": "StrongPass123",
            },
        )

    assert response.status_code == 409


def test_register_rejects_short_password(client, mock_users):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Javeria Malik",
            "email": "javeria@example.com",
            "password": "short",
        },
    )

    assert response.status_code == 422
    mock_users.insert_one.assert_not_called()


def test_login_success(client, mock_users):
    user_id = ObjectId()
    mock_users.find_one.return_value = {
        "_id": user_id,
        "name": "Javeria Malik",
        "email": "javeria@example.com",
        "hashed_password": "hashed_password",
    }

    with patch(
        "app.api.auth.verify_password",
        return_value=True,
    ), patch(
        "app.api.auth.create_access_token",
        return_value="test-token",
    ):
        response = client.post(
            "/api/auth/login",
            json={
                "email": "JAVERIA@example.com",
                "password": "StrongPass123",
            },
        )

    assert response.status_code == 200
    assert response.json()["access_token"] == "test-token"
    assert response.json()["user"]["email"] == "javeria@example.com"


def test_login_wrong_password(client, mock_users):
    mock_users.find_one.return_value = {
        "_id": ObjectId(),
        "name": "Javeria Malik",
        "email": "javeria@example.com",
        "hashed_password": "hashed_password",
    }

    with patch(
        "app.api.auth.verify_password",
        return_value=False,
    ):
        response = client.post(
            "/api/auth/login",
            json={
                "email": "javeria@example.com",
                "password": "WrongPass123",
            },
        )

    assert response.status_code == 401


def test_login_unknown_email(client, mock_users):
    mock_users.find_one.return_value = None

    response = client.post(
        "/api/auth/login",
        json={
            "email": "unknown@example.com",
            "password": "StrongPass123",
        },
    )

    assert response.status_code == 401
