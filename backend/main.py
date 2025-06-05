# import json # Keep if used elsewhere, but not for symptoms if they become lists
import os
import json # Make sure json is imported
import uuid # Added for generating IDs where needed
from datetime import datetime, timedelta # Keep timedelta if used for other things, else can be removed
from typing import List, Optional

# Firebase/Firestore specific imports
from google.cloud.firestore_v1.client import Client as FirestoreClient # For type hinting
from firebase_admin import auth as firebase_auth # For verifying ID tokens
from firebase_admin import firestore # Added for firestore.Query.DESCENDING

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.security import OAuth2PasswordRequestForm # Removed

import google.generativeai as genai
from dotenv import load_dotenv

# Local imports
from database import get_firestore_db # Changed from get_db, engine removed
# import models # models.py is no longer for SQLAlchemy Base
import schemas # Our Pydantic schemas

# Updated auth imports
from auth import get_current_active_user #, get_current_firebase_user # get_current_firebase_user is used by get_current_active_user

# Load environment variables
load_dotenv()

# Create tables - REMOVED SQLAlchemy specific
# models.Base.metadata.create_all(bind=engine)

# Set up FastAPI app
app = FastAPI(
    title="Medical Assistant API with Firebase",
    description="Backend API for Doctor-Patient Medical Application using Firebase/Firestore",
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

# Configure Gemini AI (remains the same)
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error configuring Gemini AI: {e}")

# --- AUTH & USER PROFILE ENDPOINTS ---

# The old /token endpoint is removed. Clients get ID tokens from Firebase.

@app.post("/users/create_profile", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    user_create_data: schemas.UserCreate, # client sends basic info
    authorization: Optional[str] = Header(None, description="Firebase ID Token: Bearer <token>"),
    db: FirestoreClient = Depends(get_firestore_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated: Missing or invalid Authorization header."
        )
    
    id_token = authorization.split("Bearer ")[1]

    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        firebase_uid = decoded_token.get("uid")
        email_from_token = decoded_token.get("email")

        if not firebase_uid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Firebase token: UID missing.")

        # Check if profile already exists for this Firebase UID
        user_doc_ref = db.collection(u'users').document(firebase_uid)
        existing_user_doc = user_doc_ref.get()
        if existing_user_doc.exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User profile already exists for this Firebase account.")

        # Optional: Check for username uniqueness if it's critical for your application
        # username_query = db.collection(u'users').where("username", "==", user_create_data.username).limit(1)
        # existing_username_snapshot = username_query.get()
        # if existing_username_snapshot: # query.get() returns a list of snapshots
        #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered.")

        doctor_profile_data = None
        if user_create_data.role == "doctor" and user_create_data.doctor_profile:
            # Assuming user_create_data.doctor_profile is compatible with schemas.DoctorProfileBase
            doctor_profile_data = schemas.DoctorProfileBase(**user_create_data.doctor_profile.model_dump())

        # Prepare data for Firestore, using Firebase UID as document ID
        # Pydantic model UserInDB expects 'id' which will be the firebase_uid
        user_in_db_data = schemas.UserInDB(
            id=firebase_uid, 
            username=user_create_data.username,
            email=user_create_data.email or email_from_token,
            full_name=user_create_data.full_name,
            role=user_create_data.role,
            disabled=False,
            hashed_password=None, # Not storing password hash when using Firebase Auth
            doctor_profile=doctor_profile_data
        )
        
        # Use model_dump(by_alias=True) if your UserInDB uses _id as an alias for id
        # Firestore document ID is firebase_uid, so the data itself doesn't need it.
        data_to_set = user_in_db_data.model_dump(exclude={'id'}) # Exclude 'id' if it's the doc key

        user_doc_ref.set(data_to_set)
        
        # Fetch the created profile to return (ensures it's correctly stored)
        newly_created_doc = user_doc_ref.get()
        if not newly_created_doc.exists:
             raise HTTPException(status_code=500, detail="Failed to create or retrieve user profile after creation.")

        # Construct the response model
        # UserResponse expects 'id'
        response_data = newly_created_doc.to_dict()
        response_data['id'] = newly_created_doc.id 
        return schemas.UserResponse(**response_data)

    except firebase_auth.FirebaseAuthError as e:
        # Catch specific Firebase auth errors
        detail_message = f"Invalid Firebase token: {str(e)}"
        if isinstance(e, firebase_auth.ExpiredIdTokenError):
            detail_message = "Firebase ID token has expired."
        elif isinstance(e, firebase_auth.RevokedIdTokenError):
            detail_message = "Firebase ID token has been revoked."
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail_message)
    except HTTPException: # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        print(f"Error creating user profile: {type(e).__name__} - {e}") # Log error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")


@app.get("/users/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: schemas.UserResponse = Depends(get_current_active_user)):
    """Get the current authenticated user's profile."""
    return current_user

# --- PATIENT CASE ENDPOINTS ---

@app.post("/patient-cases", response_model=schemas.PatientCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_patient_case(
    case_create: schemas.PatientCaseCreate,
    current_user: schemas.UserResponse = Depends(get_current_active_user), # Any authenticated user can create a case
    db: FirestoreClient = Depends(get_firestore_db)
):
    try:
        patient_id = current_user.id # The user creating the case is the patient

        # Prepare data for Firestore document
        # Symptoms are List[str] in Pydantic, store as JSON string in Firestore (matching sample data)
        symptoms_json_str = json.dumps(case_create.symptoms)

        # Data for the new patient case document
        new_case_data = case_create.model_dump(exclude_unset=True) # Get all fields from create schema
        new_case_data['symptoms'] = symptoms_json_str
        new_case_data['patient_id'] = patient_id
        new_case_data['timestamp'] = datetime.utcnow()
        new_case_data['updated_at'] = datetime.utcnow()
        if 'status' not in new_case_data: # Default status if not provided
            new_case_data['status'] = "pending"
        # ai_recommendation, doctor_id, doctor_notes, doctor_recommendation are typically not set on creation by patient

        # Create a new document with an auto-generated ID
        doc_ref = db.collection(u'patientCases').document()
        doc_ref.set(new_case_data)

        # Fetch the newly created document to include its ID and confirm creation
        created_doc_snapshot = doc_ref.get()
        if not created_doc_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create patient case.")

        response_data = created_doc_snapshot.to_dict()
        response_data['id'] = created_doc_snapshot.id
        response_data['symptoms'] = json.loads(response_data['symptoms']) # Convert back to list for response

        return schemas.PatientCaseResponse(**response_data)
    except Exception as e:
        print(f"Error creating patient case: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while creating patient case.")


@app.get("/patient-cases", response_model=List[schemas.PatientCaseResponse])
async def get_all_patient_cases(
    current_user: schemas.UserResponse = Depends(get_current_active_user),
    db: FirestoreClient = Depends(get_firestore_db)
):
    # Authorization: Only doctors can see all patient cases for now.
    # You might want different logic, e.g., patients see their own cases, doctors see assigned/all cases.
    if current_user.role != "doctor":
        # If it's a patient, let's return their cases. This part was missing in the old version for doctors.
        # For a patient, we'd query where patient_id == current_user.id
        query = db.collection(u'patientCases').where(filter=firestore.FieldFilter("patient_id", "==", current_user.id))
    else:
        # Doctors see all cases
        query = db.collection(u'patientCases')

    try:
        cases_snapshot = query.order_by("timestamp", direction=firestore.Query.DESCENDING).get()
        
        response_cases: List[schemas.PatientCaseResponse] = []
        for doc in cases_snapshot:
            case_data = doc.to_dict()
            case_data['id'] = doc.id
            # Symptoms are stored as JSON string, convert to list for response
            if 'symptoms' in case_data and isinstance(case_data['symptoms'], str):
                case_data['symptoms'] = json.loads(case_data['symptoms'])
            else:
                case_data['symptoms'] = [] # Default to empty list if missing or not a string
            response_cases.append(schemas.PatientCaseResponse(**case_data))
        return response_cases
    except Exception as e:
        print(f"Error getting patient cases: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while fetching patient cases.")


@app.get("/patient-cases/{case_id}", response_model=schemas.PatientCaseResponse)
async def get_single_patient_case(
    case_id: str,
    current_user: schemas.UserResponse = Depends(get_current_active_user),
    db: FirestoreClient = Depends(get_firestore_db)
):
    try:
        doc_ref = db.collection(u'patientCases').document(case_id)
        doc_snapshot = doc_ref.get()

        if not doc_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient case not found")

        case_data = doc_snapshot.to_dict()
        case_data['id'] = doc_snapshot.id

        # Authorization: Doctor can see any case. Patient can only see their own case.
        if current_user.role == "patient" and case_data.get("patient_id") != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this patient case")
        
        if 'symptoms' in case_data and isinstance(case_data['symptoms'], str):
            case_data['symptoms'] = json.loads(case_data['symptoms'])
        else:
            case_data['symptoms'] = []

        return schemas.PatientCaseResponse(**case_data)
    except HTTPException: # Re-raise known HTTP exceptions
        raise
    except Exception as e:
        print(f"Error getting single patient case: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while fetching the patient case.")


@app.put("/patient-cases/{case_id}", response_model=schemas.PatientCaseResponse)
async def update_existing_patient_case(
    case_id: str,
    case_update: schemas.PatientCaseUpdate,
    current_user: schemas.UserResponse = Depends(get_current_active_user),
    db: FirestoreClient = Depends(get_firestore_db)
):
    doc_ref = db.collection(u'patientCases').document(case_id)
    
    try:
        doc_snapshot = doc_ref.get()
        if not doc_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient case not found to update")

        existing_case_data = doc_snapshot.to_dict()

        # Authorization: Only a doctor can update a case, 
        # or a patient can update certain fields of their own case if logic allows (not implemented here for simplicity).
        # Current logic: only doctors can assign themselves or add notes.
        if current_user.role != "doctor":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update patient case. Only doctors can update.")
        
        # If the case is being assigned to the current doctor
        if case_update.doctor_id and case_update.doctor_id == current_user.id:
            pass # This is fine
        elif case_update.doctor_id: # Trying to assign to a *different* doctor ID
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctors can only assign cases to themselves.")

        update_payload = case_update.model_dump(exclude_unset=True)

        # Handle symptoms: if provided in update, convert list to JSON string
        if 'symptoms' in update_payload and isinstance(update_payload['symptoms'], list):
            update_payload['symptoms'] = json.dumps(update_payload['symptoms'])
        
        # Ensure doctor_id is set to the current doctor if they are making substantive changes
        # like adding notes or changing status (and not just viewing/minor edits by patient if that was allowed)
        if any(k in update_payload for k in ['doctor_notes', 'doctor_recommendation', 'status', 'severity']):
             update_payload['doctor_id'] = current_user.id # Assign/confirm current doctor

        update_payload['updated_at'] = datetime.utcnow()

        doc_ref.update(update_payload)

        updated_doc_snapshot = doc_ref.get()
        response_data = updated_doc_snapshot.to_dict()
        response_data['id'] = updated_doc_snapshot.id
        if 'symptoms' in response_data and isinstance(response_data['symptoms'], str):
            response_data['symptoms'] = json.loads(response_data['symptoms'])
        else:
            response_data['symptoms'] = []

        return schemas.PatientCaseResponse(**response_data)
    except HTTPException: # Re-raise known HTTP exceptions
        raise
    except Exception as e:
        print(f"Error updating patient case: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while updating the patient case.")

# --- CHAT ENDPOINTS ---

@app.get("/chats/{patient_case_id}", response_model=List[schemas.ChatMessageResponse])
async def get_chat_messages_for_case(
    patient_case_id: str,
    current_user: schemas.UserResponse = Depends(get_current_active_user),
    db: FirestoreClient = Depends(get_firestore_db)
):
    try:
        # Verify patient case exists
        case_doc_ref = db.collection(u'patientCases').document(patient_case_id)
        case_snapshot = case_doc_ref.get()
        if not case_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient case not found")
        
        # Authorization: User must be the patient of the case or a doctor.
        # If current user is a patient, they must be the patient_id on the case.
        # Doctors are assumed to have broader access, but could be restricted to assigned cases.
        patient_case_data = case_snapshot.to_dict()
        if current_user.role == "patient" and patient_case_data.get("patient_id") != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view these chat messages.")

        # Query chats for this patient_case_id from the top-level 'chats' collection
        chats_query = db.collection(u'chats') \
                        .where(filter=firestore.FieldFilter("patient_case_id", "==", patient_case_id)) \
                        .order_by("timestamp", direction=firestore.Query.ASCENDING) # Show oldest first
        
        chats_snapshot = chats_query.get()
        
        response_chats: List[schemas.ChatMessageResponse] = []
        for doc in chats_snapshot:
            chat_data = doc.to_dict()
            chat_data['id'] = doc.id # Ensure ID is in the response data
            response_chats.append(schemas.ChatMessageResponse(**chat_data))
            
        return response_chats

    except HTTPException: # Re-raise known HTTP exceptions
        raise
    except Exception as e:
        print(f"Error getting chat messages: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while fetching chat messages.")


@app.post("/chats", response_model=schemas.ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def create_new_chat_message(
    message_create: schemas.ChatMessageCreate, 
    current_user: schemas.UserResponse = Depends(get_current_active_user),
    db: FirestoreClient = Depends(get_firestore_db)
):
    try:
        # Verify patient case exists
        case_doc_ref = db.collection(u'patientCases').document(message_create.patient_case_id)
        case_snapshot = case_doc_ref.get()
        if not case_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient case {message_create.patient_case_id} not found.")

        patient_case_data = case_snapshot.to_dict()
        is_patient_of_case = current_user.role == "patient" and patient_case_data.get("patient_id") == current_user.id
        is_doctor = current_user.role == "doctor"
        
        if not (is_patient_of_case or is_doctor):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to post chat message to this case.")

        if current_user.role == "patient" and message_create.sender_type != "patient":
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Patients can only send messages as 'patient'.")
        if current_user.role == "doctor" and message_create.sender_type not in ["doctor", "ai"]:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctors can only send messages as 'doctor' or 'ai'.")

        chat_message_id = uuid.uuid4().hex
        
        new_chat_data_model = schemas.ChatMessageInDB(
            id=chat_message_id,
            timestamp=datetime.utcnow(),
            patient_case_id=message_create.patient_case_id,
            sender_id=current_user.id,
            sender_type=message_create.sender_type,
            content=message_create.content
        )
        
        # model_dump by default excludes 'id' if it's not in the main model fields (e.g. if aliased to _id and by_alias=False)
        # If 'id' is a direct field, and we use it as doc ID, we might want to exclude it from the dict to store.
        data_to_firestore = new_chat_data_model.model_dump(exclude={'id'} if new_chat_data_model.id == chat_message_id else None)
        # if UserInDB uses Field(alias='_id'), then model_dump(by_alias=True) is needed and then exclude '_id'

        chat_doc_ref = db.collection(u'chats').document(chat_message_id)
        chat_doc_ref.set(data_to_firestore)
        
        # For the response, we use the data from the model which includes the ID.
        return schemas.ChatMessageResponse(**new_chat_data_model.model_dump()) # Pass all fields from model to response

    except HTTPException: 
        raise
    except Exception as e:
        print(f"Error creating chat message: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while creating the chat message.")

# --- AI ASSISTANT ENDPOINT ---

@app.post("/ai-assistant")
async def doctor_ai_assistant(
    request: schemas.AIAssistantRequest,
    current_user: schemas.UserResponse = Depends(get_current_active_user)
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
        print(f"Error in AI assistant: {type(e).__name__} - {e}")
        # Consider returning a more structured error response if clients expect it
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI response: {str(e)}"
        )

# --- DOCTOR PROFILE ENDPOINTS ---

@app.get("/doctor-profiles/{user_id}", response_model=schemas.DoctorProfile)
async def get_doctor_profile_by_user_id(
    user_id: str,
    db: FirestoreClient = Depends(get_firestore_db)
):
    try:
        profile_doc_ref = db.collection(u'doctor_profiles').document(user_id)
        profile_snapshot = profile_doc_ref.get()

        if not profile_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")

        profile_data = profile_snapshot.to_dict()
        profile_data['id'] = profile_snapshot.id
        profile_data['user_id'] = profile_snapshot.id 

        notification_prefs_raw = profile_data.get('notification_preferences')
        if isinstance(notification_prefs_raw, str):
            profile_data['notification_preferences'] = schemas.NotificationPreferences(**json.loads(notification_prefs_raw))
        elif isinstance(notification_prefs_raw, dict):
            profile_data['notification_preferences'] = schemas.NotificationPreferences(**notification_prefs_raw)
        else:
            profile_data['notification_preferences'] = None # Or default

        return schemas.DoctorProfile(**profile_data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting doctor profile: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching doctor profile.")


@app.post("/doctor-profiles", response_model=schemas.DoctorProfile, status_code=status.HTTP_201_CREATED)
async def create_doctor_profile_for_current_user(
    profile_create: schemas.DoctorProfileCreate,
    current_user: schemas.UserResponse = Depends(get_current_active_user),
    db: FirestoreClient = Depends(get_firestore_db)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only doctors can create profiles.")

    profile_doc_ref = db.collection(u'doctor_profiles').document(current_user.id)
    try:
        existing_profile_snapshot = profile_doc_ref.get()
        if existing_profile_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile already exists for this user.")

        profile_data_to_store = profile_create.model_dump(exclude_unset=True)
        profile_data_to_store['user_id'] = current_user.id
        profile_data_to_store['created_at'] = datetime.utcnow()
        profile_data_to_store['updated_at'] = datetime.utcnow()

        if profile_create.notification_preferences:
            profile_data_to_store['notification_preferences'] = json.dumps(profile_create.notification_preferences.model_dump())
        else:
            default_prefs = schemas.NotificationPreferences()
            profile_data_to_store['notification_preferences'] = json.dumps(default_prefs.model_dump())

        profile_doc_ref.set(profile_data_to_store)

        # For response, convert notification_preferences back to model
        response_data = profile_data_to_store.copy()
        response_data['id'] = current_user.id 
        if isinstance(response_data['notification_preferences'], str):
            response_data['notification_preferences'] = schemas.NotificationPreferences(**json.loads(response_data['notification_preferences']))

        return schemas.DoctorProfile(**response_data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating doctor profile: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error creating doctor profile.")


@app.put("/doctor-profiles/{profile_doc_id}", response_model=schemas.DoctorProfile)
async def update_doctor_profile_by_id(
    profile_doc_id: str,
    profile_update: schemas.DoctorProfileUpdate,
    current_user: schemas.UserResponse = Depends(get_current_active_user),
    db: FirestoreClient = Depends(get_firestore_db)
):
    if current_user.id != profile_doc_id or current_user.role != "doctor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this profile.")

    profile_doc_ref = db.collection(u'doctor_profiles').document(profile_doc_id)
    try:
        if not (profile_doc_ref.get()).exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found to update.")

        update_data = profile_update.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.utcnow()

        if 'notification_preferences' in update_data:
            if update_data['notification_preferences'] is not None:
                # Expecting a dict from Pydantic model_dump or a NotificationPreferences model
                if isinstance(update_data['notification_preferences'], schemas.NotificationPreferences):
                    update_data['notification_preferences'] = json.dumps(update_data['notification_preferences'].model_dump())
                elif isinstance(update_data['notification_preferences'], dict):
                    update_data['notification_preferences'] = json.dumps(update_data['notification_preferences'])
                # else: it's some other type, maybe raise error or ignore
            else: # if explicitly set to None
                # Decide: remove field, or store as null/default JSON string?
                # Storing as default JSON string for consistency if field is always expected by schema.
                default_prefs = schemas.NotificationPreferences()
                update_data['notification_preferences'] = json.dumps(default_prefs.model_dump())

        profile_doc_ref.update(update_data)

        updated_snapshot = profile_doc_ref.get()
        response_data = updated_snapshot.to_dict()
        response_data['id'] = updated_snapshot.id
        response_data['user_id'] = updated_snapshot.id 

        notification_prefs_raw = response_data.get('notification_preferences')
        if isinstance(notification_prefs_raw, str):
            response_data['notification_preferences'] = schemas.NotificationPreferences(**json.loads(notification_prefs_raw))
        elif isinstance(notification_prefs_raw, dict):
             response_data['notification_preferences'] = schemas.NotificationPreferences(**notification_prefs_raw)
        else:
            response_data['notification_preferences'] = None # Or default

        return schemas.DoctorProfile(**response_data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating doctor profile: {type(e).__name__} - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error updating doctor profile.")

# Health check endpoint

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Add initial data for development

@app.on_event("startup")
async def startup_db_client():
    db: FirestoreClient = get_firestore_db()
    
    users_collection_ref = db.collection(u'users')
    users_query_snapshot = users_collection_ref.limit(1).get()
    if not users_query_snapshot: 
        print("Initializing sample data in Firestore...")
        
        doctor_firebase_uid = "sample-doc-" + uuid.uuid4().hex[:6]
        doctor_user_data_dict = schemas.UserInDB(
            id=doctor_firebase_uid,
            username="dr_house",
            email="gregory.house@example.com",
            full_name="Dr. Gregory House",
            role="doctor",
            disabled=False,
            hashed_password=None,
            doctor_profile=schemas.DoctorProfileBase(
                full_name="Dr. Gregory House", 
                specialization="Diagnostic Medicine", 
                bio="Head of Diagnostics, renowned for unconventional insights.",
                contact_email="gregory.house@example.com"
            )
        ).model_dump(exclude={'id'})
        users_collection_ref.document(doctor_firebase_uid).set(doctor_user_data_dict)

        doctor_profile_for_db = schemas.DoctorProfile(
            id=doctor_firebase_uid,
            user_id=doctor_firebase_uid,
            full_name="Dr. Gregory House",
            specialization="Diagnostic Medicine",
            bio="Head of Diagnostics, renowned for unconventional insights.",
            contact_email="gregory.house@example.com",
            notification_preferences=schemas.NotificationPreferences(email=True, sms=True, app=True),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        ).model_dump()
        doctor_profile_for_db['notification_preferences'] = json.dumps(doctor_profile_for_db['notification_preferences'])
        db.collection(u'doctor_profiles').document(doctor_profile_for_db.pop('id')).set(doctor_profile_for_db)

        patient_firebase_uid = "sample-patient-" + uuid.uuid4().hex[:6]
        patient_user_data_dict = schemas.UserInDB(
            id=patient_firebase_uid,
            username="john_q_public",
            email="john.public@example.com",
            full_name="John Q. Public",
            role="patient",
            disabled=False,
            hashed_password=None
        ).model_dump(exclude={'id'})
        users_collection_ref.document(patient_firebase_uid).set(patient_user_data_dict)

        patient_cases_collection_ref = db.collection(u'patientCases')
        sample_cases_data = [
            {
                "patient_id": patient_firebase_uid,
                "name": "Routine Checkup", 
                "age": 42, 
                "gender": "Male", 
                "severity": "low", 
                "symptoms": json.dumps(["General fatigue", "Occasional headache"]),
                "ai_recommendation": "Standard blood work recommended. Monitor symptoms.", 
                "status": "pending",
                "timestamp": datetime.utcnow(), "updated_at": datetime.utcnow(), "doctor_id": None
            },
            {
                "patient_id": patient_firebase_uid,
                "name": "Flu Symptoms", 
                "age": 42, 
                "gender": "Male", 
                "severity": "medium", 
                "symptoms": json.dumps(["Fever", "Cough", "Body aches"]),
                "ai_recommendation": "Advise rest, hydration, and over-the-counter medication. Consider testing for influenza if symptoms persist or worsen.", 
                "status": "pending",
                "timestamp": datetime.utcnow(), "updated_at": datetime.utcnow(), "doctor_id": None
            }
        ]
        for case_data in sample_cases_data:
            patient_cases_collection_ref.add(case_data)
        print("Sample data initialization complete.")
    else:
        print("Existing data found. Skipping sample data initialization.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) # Added reload=True for dev
