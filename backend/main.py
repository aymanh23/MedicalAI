
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Set up FastAPI app
app = FastAPI(title="Medical Assistant API", 
              description="Backend API for Doctor-Patient Medical Application",
              version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Specify your frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-development")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Configure Gemini AI
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error configuring Gemini AI: {e}")

# --- DATABASE MODELS ---
# In a production environment, use an ORM like SQLAlchemy
# For simplicity, we'll use in-memory storage for this example

# Sample data
doctors = {
    "dr_smith": {
        "username": "dr_smith",
        "email": "dr.smith@example.com",
        "full_name": "Dr. John Smith",
        "hashed_password": pwd_context.hash("password123"),
        "disabled": False,
        "role": "doctor"
    }
}

patients = {}

patient_cases = [
    {
        "id": "1",
        "name": "John Doe",
        "age": 45,
        "gender": "Male",
        "severity": "high",
        "symptoms": ["Chest pain", "Shortness of breath", "Dizziness"],
        "ai_recommendation": "Seek immediate medical attention. Symptoms suggest possible cardiac event.",
        "timestamp": datetime.now().isoformat(),
        "status": "pending",
        "doctor_id": None
    },
    {
        "id": "2",
        "name": "Jane Smith",
        "age": 35,
        "gender": "Female",
        "severity": "medium",
        "symptoms": ["Headache", "Nausea", "Light sensitivity"],
        "ai_recommendation": "Schedule an appointment within 24-48 hours. Symptoms suggest possible migraine.",
        "timestamp": (datetime.now() - timedelta(hours=1)).isoformat(),
        "status": "pending",
        "doctor_id": None
    },
    {
        "id": "3",
        "name": "Robert Johnson",
        "age": 28,
        "gender": "Male",
        "severity": "low",
        "symptoms": ["Sore throat", "Mild fever", "Cough"],
        "ai_recommendation": "Rest and hydrate. Follow up if symptoms worsen or persist beyond 3-5 days.",
        "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
        "status": "pending",
        "doctor_id": None
    }
]

chats = []

# --- PYDANTIC MODELS ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    role: str

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str

class Symptom(BaseModel):
    name: str

class PatientCaseCreate(BaseModel):
    name: str
    age: int
    gender: str
    symptoms: List[str]
    medical_history: Optional[str] = None

class PatientCaseUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    doctor_notes: Optional[str] = None
    doctor_recommendation: Optional[str] = None

class PatientCase(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    severity: str
    symptoms: List[str]
    ai_recommendation: str
    timestamp: str
    status: str
    doctor_id: Optional[str] = None
    doctor_notes: Optional[str] = None
    doctor_recommendation: Optional[str] = None
    medical_history: Optional[str] = None

class ChatMessage(BaseModel):
    patient_case_id: str
    sender_type: str  # "doctor" or "ai"
    content: str

class AIAssistantRequest(BaseModel):
    prompt: str
    patient_symptoms: List[str]
    patient_history: Optional[str] = None

# --- AUTHENTICATION FUNCTIONS ---

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None

def authenticate_user(db, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception
    
    # Check in both doctors and patients dictionaries
    if token_data.role == "doctor":
        user = get_user(doctors, username=token_data.username)
    else:
        user = get_user(patients, username=token_data.username)
        
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# --- AUTH ENDPOINTS ---

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Try to authenticate in doctors first
    user = authenticate_user(doctors, form_data.username, form_data.password)
    if not user:
        # Then try patients
        user = authenticate_user(patients, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register", response_model=User)
async def register_user(user: UserCreate):
    if user.username in doctors or user.username in patients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    hashed_password = get_password_hash(user.password)
    user_data = user.dict()
    user_data.pop("password")
    user_data["hashed_password"] = hashed_password
    user_data["disabled"] = False
    
    if user.role == "doctor":
        doctors[user.username] = user_data
    else:
        patients[user.username] = user_data
    
    return user_data

# --- PATIENT CASE ENDPOINTS ---

@app.get("/patient-cases", response_model=List[PatientCase])
async def get_patient_cases(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view patient cases"
        )
    return patient_cases

@app.get("/patient-cases/{case_id}", response_model=PatientCase)
async def get_patient_case(case_id: str, current_user: User = Depends(get_current_active_user)):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view patient cases"
        )
    
    for case in patient_cases:
        if case["id"] == case_id:
            return case
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Patient case not found"
    )

@app.put("/patient-cases/{case_id}", response_model=PatientCase)
async def update_patient_case(
    case_id: str, 
    case_update: PatientCaseUpdate,
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update patient cases"
        )
    
    for case in patient_cases:
        if case["id"] == case_id:
            update_data = case_update.dict(exclude_unset=True)
            for key, value in update_data.items():
                case[key] = value
            case["doctor_id"] = current_user.username
            return case
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Patient case not found"
    )

@app.post("/patient-cases", response_model=PatientCase)
async def create_patient_case(case: PatientCaseCreate):
    # This endpoint would typically require authentication but we're making it public
    # for demonstration purposes - in a real app this might be accessed via a patient portal
    
    import uuid
    
    new_case = {
        "id": str(uuid.uuid4()),
        "name": case.name,
        "age": case.age,
        "gender": case.gender,
        "severity": "medium",  # Default severity, would be determined by AI in real app
        "symptoms": case.symptoms,
        "ai_recommendation": "Please wait for doctor review.",  # Default recommendation
        "timestamp": datetime.now().isoformat(),
        "status": "pending",
        "doctor_id": None,
        "medical_history": case.medical_history
    }
    
    patient_cases.append(new_case)
    return new_case

# --- CHAT ENDPOINTS ---

@app.get("/chats/{patient_case_id}", response_model=List[ChatMessage])
async def get_chat_messages(
    patient_case_id: str,
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view chat messages"
        )
    
    return [chat for chat in chats if chat["patient_case_id"] == patient_case_id]

@app.post("/chats", response_model=ChatMessage)
async def create_chat_message(
    message: ChatMessage,
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create chat messages"
        )
    
    # Check if patient case exists
    case_exists = any(case["id"] == message.patient_case_id for case in patient_cases)
    if not case_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient case not found"
        )
    
    new_message = message.dict()
    chats.append(new_message)
    return new_message

# --- AI ASSISTANT ENDPOINT ---

@app.post("/ai-assistant")
async def doctor_ai_assistant(
    request: AIAssistantRequest,
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to use AI assistant"
        )
    
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini API key not configured"
            )
        
        model = genai.GenerativeModel(model_name="gemini-1.5-flash")
        
        # Create context for the AI based on patient information
        context_prompt = f"""
You are a medical AI assistant helping a doctor review a patient case. Please provide concise, 
professional medical information based on your medical knowledge.

PATIENT INFORMATION:
- Symptoms: {', '.join(request.patient_symptoms)}
{f"- Medical History: {request.patient_history}" if request.patient_history else ''}

DOCTOR'S QUESTION: {request.prompt}

Please provide a medically accurate response. If you're uncertain, indicate the limitations of your knowledge.
"""
        
        response = model.generate_content(context_prompt)
        
        return {"response": response.text}
    
    except Exception as e:
        return {
            "error": "Failed to generate AI response",
            "details": str(e),
            "modelInfo": "Attempted to use model: gemini-1.5-flash"
        }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
