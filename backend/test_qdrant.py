
import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

url = os.getenv("QDRANT_URL")
api_key = os.getenv("QDRANT_API_KEY")

if not url or not api_key:
    raise ValueError(
        "QDRANT_URL ya QDRANT_API_KEY backend/.env mein missing hai."
    )

client = QdrantClient(
    url=url,
    api_key=api_key,
    timeout=30,
)

try:
    result = client.get_collections()
    print("Qdrant connected successfully!")
    print("Available collections:")

    for collection in result.collections:
        print("-", collection.name)

    if not result.collections:
        print("Abhi koi collection nahi hai. Ye normal hai.")

except Exception as error:
    print("Qdrant connection failed.")
    print("Error:", error)

finally:
    client.close()
