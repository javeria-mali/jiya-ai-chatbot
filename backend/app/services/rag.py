
import os
from functools import lru_cache

from dotenv import load_dotenv
from fastembed import TextEmbedding
from qdrant_client import QdrantClient

load_dotenv()

COLLECTION_NAME = "jiya_knowledge"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedding_model():
    return TextEmbedding(model_name=MODEL_NAME)


def retrieve_context(question: str, limit: int = 4) -> str:
    """Retrieve relevant knowledge-base chunks from Qdrant."""
    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")

    if not url or not api_key:
        raise RuntimeError("Qdrant configuration is missing.")

    client = QdrantClient(
        url=url,
        api_key=api_key,
        timeout=30,
    )

    try:
        model = get_embedding_model()
        query_vector = list(model.embed([question]))[0].tolist()

        results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            limit=limit,
            with_payload=True,
        )

        context_parts = []

        for point in results.points:
            payload = point.payload or {}
            text = payload.get("text", "")
            source = payload.get("source", "Knowledge base")

            if text:
                context_parts.append(
                    f"Source: {source}\nContent: {text}"
                )

        return "\n\n".join(context_parts)

    finally:
        client.close()
