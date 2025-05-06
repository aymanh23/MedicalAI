from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import json
import os
from datetime import datetime, timedelta
from typing import List
import uuid
import google.generativeai as genai
from dotenv import load_dotenv

# Local imports
from database import engine, get_db
import models
import schemas
from auth import authenticate_user, create_access_token, get_current_active_user, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES

# Load environment variables
load_dotenv()

# Create tables
models.Base.metadata.create_all(bind=engine)

# Set up FastAPI app
app = FastAPI(
    title="Medical Assistant API",
    description="Backend API for Doctor-Patient Medical Application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Specify your frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini AI
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error configuring Gemini AI: {e}")

# --- AUTH ENDPOINTS ---

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
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

@app.post("/register", response_model=schemas.User)
async def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if username already exists
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role,
        disabled=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- PATIENT CASE ENDPOINTS ---

@app.get("/patient-cases", response_model=List[schemas.PatientCase])
async def get_patient_cases(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view patient cases"
        )
    
    cases = db.query(models.PatientCase).all()
    # Convert symptoms from stored JSON string to list
    for case in cases:
        case.symptoms = json.loads(case.symptoms)
    
    return cases

@app.get("/patient-cases/{case_id}", response_model=schemas.PatientCase)
async def get_patient_case(
    case_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view patient cases"
        )
    
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    
    case = db.query(models.PatientCase).filter(models.PatientCase.id == case_uuid).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient case not found"
        )
    
    # Convert symptoms from stored JSON string to list
    case.symptoms = json.loads(case.symptoms)
    
    return case

@app.put("/patient-cases/{case_id}", response_model=schemas.PatientCase)
async def update_patient_case(
    case_id: str,
    case_update: schemas.PatientCaseUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update patient cases"
        )
    
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    
    case = db.query(models.PatientCase).filter(models.PatientCase.id == case_uuid).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient case not found"
        )
    
    # Update case fields
    for key, value in case_update.dict(exclude_unset=True).items():
        setattr(case, key, value)
    
    case.doctor_id = current_user.id
    
    db.commit()
    db.refresh(case)
    
    # Convert symptoms from stored JSON string to list for response
    case.symptoms = json.loads(case.symptoms)
    
    return case

@app.post("/patient-cases", response_model=schemas.PatientCase)
async def create_patient_case(
    case: schemas.PatientCaseCreate,
    db: Session = Depends(get_db)
):
    # This endpoint would typically require authentication but we're making it public
    # for demonstration purposes - in a real app this might be accessed via a patient portal
    
    # Create new patient case
    new_case = models.PatientCase(
        name=case.name,
        age=case.age,
        gender=case.gender,
        severity="medium",  # Default severity, would be determined by AI in real app
        symptoms=json.dumps(case.symptoms),  # Convert list to JSON string for storage
        ai_recommendation="Please wait for doctor review.",  # Default recommendation
        status="pending",
        doctor_id=None,
        medical_history=case.medical_history
    )
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    # Convert symptoms from stored JSON string to list for response
    new_case.symptoms = case.symptoms
    
    return new_case

# --- CHAT ENDPOINTS ---

@app.get("/chats/{patient_case_id}", response_model=List[schemas.ChatMessageResponse])
async def get_chat_messages(
    patient_case_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view chat messages"
        )
    
    try:
        case_uuid = uuid.UUID(patient_case_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    
    # Check if patient case exists
    case = db.query(models.PatientCase).filter(models.PatientCase.id == case_uuid).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient case not found"
        )
    
    chats = db.query(models.Chat).filter(models.Chat.patient_case_id == case_uuid).all()
    return chats

@app.post("/chats", response_model=schemas.ChatMessageResponse)
async def create_chat_message(
    message: schemas.ChatMessage,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create chat messages"
        )
    
    try:
        case_uuid = message.patient_case_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    
    # Check if patient case exists
    case = db.query(models.PatientCase).filter(models.PatientCase.id == case_uuid).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient case not found"
        )
    
    # Create new chat message
    new_message = models.Chat(
        patient_case_id=message.patient_case_id,
        sender_type=message.sender_type,
        content=message.content,
        doctor_id=current_user.id
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return new_message

# --- AI ASSISTANT ENDPOINT ---

@app.post("/ai-assistant")
async def doctor_ai_assistant(
    request: schemas.AIAssistantRequest,
    current_user: models.User = Depends(get_current_active_user)
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

# --- DOCTOR PROFILE ENDPOINTS ---

@app.get("/doctor-profile/{user_id}", response_model=schemas.DoctorProfile)
async def get_doctor_profile(
    user_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    
    profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == user_uuid).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    return profile

@app.post("/doctor-profile", response_model=schemas.DoctorProfile)
async def create_doctor_profile(
    profile: schemas.DoctorProfileCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can create profiles"
        )
    
    # Check if profile already exists
    existing_profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == current_user.id).first()
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists for this user"
        )
    
    # Create new profile
    notification_prefs = profile.notification_preferences.dict() if profile.notification_preferences else {
        "email": True,
        "sms": False,
        "app": True
    }
    
    new_profile = models.DoctorProfile(
        user_id=current_user.id,
        full_name=profile.full_name,
        specialization=profile.specialization,
        bio=profile.bio,
        contact_email=profile.contact_email,
        phone_number=profile.phone_number,
        notification_preferences=json.dumps(notification_prefs)
    )
    
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    # Convert notification_preferences from JSON string back to dict
    new_profile.notification_preferences = json.loads(new_profile.notification_preferences)
    
    return new_profile

@app.put("/doctor-profile/{profile_id}", response_model=schemas.DoctorProfile)
async def update_doctor_profile(
    profile_id: str,
    profile_update: schemas.DoctorProfileUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        profile_uuid = uuid.UUID(profile_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    
    profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.id == profile_uuid).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Ensure user can only update their own profile
    if profile.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this profile"
        )
    
    # Update profile fields
    update_data = profile_update.dict(exclude_unset=True)
    
    # Handle notification preferences separately if included
    if "notification_preferences" in update_data:
        notification_prefs = update_data.pop("notification_preferences")
        profile.notification_preferences = json.dumps(notification_prefs)
    
    # Update the other fields
    for key, value in update_data.items():
        setattr(profile, key, value)
    
    db.commit()
    db.refresh(profile)
    
    # Convert notification_preferences from JSON string to dict for response
    profile.notification_preferences = json.loads(profile.notification_preferences)
    
    return profile

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Add initial data for development
@app.on_event("startup")
async def startup_db_client():
    db = next(get_db())
    # Only add sample data if no users exist yet
    user_count = db.query(models.User).count()
    if user_count == 0:
        # Create sample doctor
        hashed_password = get_password_hash("password123")
        doctor = models.User(
            username="dr_smith",
            email="dr.smith@example.com",
            full_name="Dr. John Smith",
            hashed_password=hashed_password,
            disabled=False,
            role="doctor"
        )
        db.add(doctor)
        db.commit()
        db.refresh(doctor)
        
        # Create sample patient cases
        sample_cases = [
            models.PatientCase(
                name="John Doe",
                age=45,
                gender="Male",
                severity="high",
                symptoms=json.dumps(["Chest pain", "Shortness of breath", "Dizziness"]),
                ai_recommendation="Seek immediate medical attention. Symptoms suggest possible cardiac event.",
                status="pending",
                doctor_id=None
            ),
            models.PatientCase(
                name="Jane Smith",
                age=35,
                gender="Female",
                severity="medium",
                symptoms=json.dumps(["Headache", "Nausea", "Light sensitivity"]),
                ai_recommendation="Schedule an appointment within 24-48 hours. Symptoms suggest possible migraine.",
                status="pending",
                doctor_id=None
            ),
            models.PatientCase(
                name="Robert Johnson",
                age=28,
                gender="Male",
                severity="low",
                symptoms=json.dumps(["Sore throat", "Mild fever", "Cough"]),
                ai_recommendation="Rest and hydrate. Follow up if symptoms worsen or persist beyond 3-5 days.",
                status="pending",
                doctor_id=None
            )
        ]
        
        db.bulk_save_objects(sample_cases)
        db.commit()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
