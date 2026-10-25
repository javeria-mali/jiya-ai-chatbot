import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

client = None
db = None


def connect_to_mongodb():
    global client, db

    mongodb_uri = os.getenv("MONGODB_URI")

    if not mongodb_uri:
        raise ValueError(
            "MONGODB_URI backend .env file mein nahi mili."
        )

    try:
        client = MongoClient(
            mongodb_uri,
            serverSelectionTimeoutMS=10000,
        )

        # MongoDB connection verify karo
        client.admin.command("ping")

        db = client["jiya_ai_chatbot"]

        # Har email ka sirf ek account ho sakta hai
        db["users"].create_index(
            "email",
            unique=True,
        )

        # User ki conversations ko date ke mutabiq load karo
        db["conversations"].create_index([
            ("user_id", 1),
            ("updated_at", -1),
        ])

        # Conversation ke messages ko chronological order mein load karo
        db["chat_messages"].create_index([
            ("conversation_id", 1),
            ("created_at", 1),
        ])

        print("MongoDB connected successfully!")

    except Exception as e:
        if client is not None:
            client.close()

        client = None
        db = None

        print("MongoDB connection failed:", str(e))
        raise


def close_mongodb_connection():
    global client, db

    if client is not None:
        client.close()

    client = None
    db = None
