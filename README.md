# Jiya AI Chatbot

A full-stack AI chatbot built with React, FastAPI, MongoDB, Groq, and Qdrant. The application supports user authentication, AI-powered conversations, persistent chat history, conversation management, and Retrieval-Augmented Generation (RAG).

## Features

- User registration and login
- Input validation
- AI-generated responses using Groq
- Persistent conversations and messages stored in MongoDB
- Create, view, rename, and delete conversations
- Conversation history grouped by date
- User-specific conversation access
- Semantic knowledge retrieval using Qdrant
- Text embeddings generated with FastEmbed
- Responsive React frontend

## Tech Stack

**Frontend:** React, Vite, JavaScript, Tailwind CSS

**Backend:** Python, FastAPI, Pydantic

**Database:** MongoDB

**AI:** Groq

**RAG / Vector Search:** Qdrant, FastEmbed

## Project Structure

```text
Full-Stack-AI-Chatbot/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── schemas/
│   │   └── services/
│   ├── knowledge_base/
│   ├── index_knowledge.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
└── README.md
```

## Prerequisites

- Python 3.12 recommended
- Node.js and npm
- MongoDB connection string
- Groq API key
- Qdrant Cloud URL and API key

## Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Full-Stack-AI-Chatbot
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the actual repository URL.

### 2. Configure the backend

```bash
cd backend
python -m venv venv
```

Activate the environment on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the backend directory using `.env.example` as a guide. Add your own MongoDB URI, Groq API key, Qdrant URL, and Qdrant API key.

### 3. Index the knowledge base

With the backend virtual environment activated, run:

```bash
python index_knowledge.py
```

This indexes the text files from the knowledge base into the Qdrant collection.

### 4. Start the backend

From the backend directory, run:

```bash
uvicorn app.main:app --reload
```

The API should be available at `http://127.0.0.1:8000`.

Interactive API documentation: `http://127.0.0.1:8000/docs`

### 5. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `GROQ_API_KEY` | Groq API key |
| `QDRANT_URL` | Qdrant cluster URL |
| `QDRANT_API_KEY` | Qdrant API key |

Never commit real API keys, database passwords, or the `.env` file to GitHub.

## RAG Workflow

1. Knowledge documents are stored in `backend/knowledge_base/`.
2. `index_knowledge.py` creates embeddings using FastEmbed.
3. Embeddings and document payloads are stored in Qdrant.
4. When a user sends a message, the backend retrieves relevant knowledge.
5. Retrieved context is included in the prompt sent to the AI model.

## Security Notes

- Authenticated endpoints should verify user identity.
- Conversation queries should be restricted to the authenticated user's own data.
- Secret keys should be stored in environment variables.
- Production deployments should configure secure CORS origins and HTTPS.

## Future Improvements

- Add automated backend and frontend tests.
- Improve RAG relevance and retrieval evaluation.
- Add deployment instructions for production hosting.

## Author

Javeria Malik
