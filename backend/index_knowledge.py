
import os
from pathlib import Path

from dotenv import load_dotenv
from qdrant_client import QdrantClient, models
from fastembed import TextEmbedding

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

if not QDRANT_URL or not QDRANT_API_KEY:
    raise ValueError("QDRANT_URL ya QDRANT_API_KEY backend/.env mein missing hai.")

BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_DIR = BASE_DIR / "knowledge_base"
COLLECTION_NAME = "jiya_knowledge"

# Lightweight local embedding model
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def read_documents():
    documents = []

    for file_path in KNOWLEDGE_DIR.glob("*.txt"):
        text = file_path.read_text(encoding="utf-8").strip()

        if not text:
            continue

        # Split text into manageable chunks
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

        for index, paragraph in enumerate(paragraphs):
            documents.append({
                "id": f"{file_path.stem}-{index}",
                "text": paragraph,
                "source": file_path.name,
            })

    return documents


def main():
    documents = read_documents()

    if not documents:
        raise RuntimeError(f"No .txt documents found in {KNOWLEDGE_DIR}")

    print(f"Found {len(documents)} text chunks.")

    embedding_model = TextEmbedding(model_name=MODEL_NAME)
    vectors = list(embedding_model.embed([doc["text"] for doc in documents]))

    vector_size = len(vectors[0])
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

    try:
        if client.collection_exists(COLLECTION_NAME):
            client.delete_collection(COLLECTION_NAME)
            print("Existing knowledge collection replaced.")

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=vector_size,
                distance=models.Distance.COSINE,
            ),
        )

        points = []

        for doc, vector in zip(documents, vectors):
            points.append(
                models.PointStruct(
                    id=abs(hash(doc["id"])) % (2**63),
                    vector=vector.tolist(),
                    payload={
                        "text": doc["text"],
                        "source": doc["source"],
                        "chunk_id": doc["id"],
                    },
                )
            )

        client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
        print(f"Success! Indexed {len(points)} chunks in '{COLLECTION_NAME}'.")

    finally:
        client.close()


if __name__ == "__main__":
    main()
