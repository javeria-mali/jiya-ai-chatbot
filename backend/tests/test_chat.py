
from unittest.mock import MagicMock, patch

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from app.main import app
from app.db import database
from app.core.security import get_current_user


@pytest.fixture
def client():
    test_user = {
        "_id": ObjectId(),
        "name": "Test User",
        "email": "test@example.com",
    }

    app.dependency_overrides[get_current_user] = lambda: test_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_db():
    conversations = MagicMock()
    messages = MagicMock()
    fake_db = {
        "conversations": conversations,
        "chat_messages": messages,
    }

    with patch.object(database, "db", fake_db):
        yield conversations, messages


def test_list_conversations_only_returns_current_users(client, mock_db):
    conversations, _ = mock_db
    conversations.find.return_value.sort.return_value = []

    response = client.get("/api/chat/conversations")

    assert response.status_code == 200
    assert response.json() == {"conversations": []}

    query = conversations.find.call_args.args[0]
    assert query["user_id"] == str(
        app.dependency_overrides[
            get_current_user
        ]()["_id"]
    )


def test_other_users_conversation_cannot_be_opened(client, mock_db):
    conversations, _ = mock_db
    conversations.find_one.return_value = None

    response = client.get("/api/chat/conversations/some-other-chat-id")

    assert response.status_code == 404
    conversations.find_one.assert_called_once()

    query = conversations.find_one.call_args.args[0]
    assert "user_id" in query


def test_other_users_conversation_cannot_be_renamed(client, mock_db):
    conversations, _ = mock_db
    conversations.find_one.return_value = None

    response = client.patch(
        "/api/chat/conversations/some-other-chat-id",
        json={"title": "Changed title"},
    )

    assert response.status_code == 404
    conversations.update_one.assert_not_called()


def test_other_users_conversation_cannot_be_deleted(client, mock_db):
    conversations, messages = mock_db
    conversations.find_one.return_value = None

    response = client.delete(
        "/api/chat/conversations/some-other-chat-id"
    )

    assert response.status_code == 404
    conversations.delete_one.assert_not_called()
    messages.delete_many.assert_not_called()


def test_conversation_requires_authentication():
    response = TestClient(app).get("/api/chat/conversations")

    assert response.status_code == 401


def test_empty_message_is_rejected(client, mock_db):
    response = client.post(
        "/api/chat/",
        json={"message": "   "},
    )

    assert response.status_code == 400
