
# Medical Assistant Application

This application consists of a FastAPI backend and a React frontend for a doctor-patient medical application with AI assistance.

## Project Structure

```
/
├── backend/               # FastAPI backend
│   ├── main.py            # Main FastAPI application
│   ├── requirements.txt   # Python dependencies
│   ├── .env.example       # Example environment variables
│   └── Dockerfile         # Docker configuration for backend
├── frontend/              # Frontend components and API client
│   ├── api.ts             # API client for connecting to the backend
│   └── components/        # React components
└── docker-compose.yml     # Docker Compose configuration
```

## Getting Started

### Prerequisites

- Python 3.7+
- Node.js 14+
- Docker (optional)

### Setup Backend

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file based on `.env.example` and add your API keys:
   ```
   cp .env.example .env
   ```

5. Run the backend:
   ```
   uvicorn main:app --reload
   ```

6. Access the API documentation at http://localhost:8000/docs

### Setup Frontend

To use the FastAPI backend with your React frontend, update the API client configuration in your React application.

### Using Docker

You can use Docker Compose to run both the frontend and backend:

```
docker-compose up
```

## API Documentation

### Authentication Endpoints
- `POST /token` - Get access token
- `POST /register` - Register a new user

### Patient Cases Endpoints
- `GET /patient-cases` - Get all patient cases
- `GET /patient-cases/{case_id}` - Get specific patient case
- `PUT /patient-cases/{case_id}` - Update patient case
- `POST /patient-cases` - Create a new patient case

### Chat Endpoints
- `GET /chats/{patient_case_id}` - Get chat messages for a patient case
- `POST /chats` - Create a new chat message

### AI Assistant Endpoint
- `POST /ai-assistant` - Send a prompt to the AI assistant with patient context

## Environment Variables

- `SECRET_KEY` - Secret key for JWT token generation
- `GEMINI_API_KEY` - API key for Google's Gemini AI model
