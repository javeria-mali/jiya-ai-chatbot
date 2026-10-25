

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Jiya AI Chatbot"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"


settings = Settings()
