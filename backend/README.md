
# Medical Assistant API

This is the backend API for the Doctor-Patient Medical Application.

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and update with your actual keys:
   ```
   cp .env.example .env
   ```
4. Run the server:
   ```
   uvicorn main:app --reload
   ```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### Authentication
- `POST /token` - Get access token
- `POST /register` - Register a new user

### Patient Cases
- `GET /patient-cases` - Get all patient cases (doctors only)
- `GET /patient-cases/{case_id}` - Get specific patient case
- `PUT /patient-cases/{case_id}` - Update patient case
- `POST /patient-cases` - Create a new patient case

### Chat
- `GET /chats/{patient_case_id}` - Get chat messages for a patient case
- `POST /chats` - Create a new chat message

### AI Assistant
- `POST /ai-assistant` - Send a prompt to the AI assistant with patient context

## Environment Variables

- `SECRET_KEY` - Secret key for JWT token generation
- `GEMINI_API_KEY` - API key for Google's Gemini AI model
