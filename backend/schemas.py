from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
# import uuid # No longer using UUID directly in models for IDs, Firestore uses strings

# --- User Schemas ---

class NotificationPreferences(BaseModel):
    email: bool = True
    sms: bool = False
    app: bool = True

class DoctorProfileBase(BaseModel): # Used for embedding in User
    full_name: Optional[str] = None # Making optional as it might come from UserBase
    specialization: str = ""
    bio: str = ""
    contact_email: Optional[str] = None # Making optional as it might come from UserBase email
    phone_number: Optional[str] = ""
    notification_preferences: Optional[NotificationPreferences] = None
    # created_at and updated_at are typically managed by Firestore or application logic for embedded objects

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str # "doctor" or "patient"

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase): # Represents a user document in Firestore
    id: str = Field(..., alias="_id") # Firestore document ID, use alias for Pydantic if field name is '_id'
    disabled: Optional[bool] = False
    hashed_password: Optional[str] = None # Store if not using Firebase Auth for passwords
    doctor_profile: Optional[DoctorProfileBase] = None # Embedded doctor profile
    # Timestamps for user creation/update can be added if needed
    # created_at: Optional[datetime] = None
    # updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True # Allows using alias _id
        # from_attributes = True # No longer needed

class UserResponse(UserBase): # For API responses, might exclude sensitive data
    id: str
    disabled: Optional[bool] = None
    doctor_profile: Optional[DoctorProfileBase] = None
    # created_at: Optional[datetime] = None
    # updated_at: Optional[datetime] = None


# --- Auth Schemas ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[str] = None # Add user_id to token data


# --- Doctor Profile Schemas ---

# DoctorProfileBase is already defined and used for embedding in User.

class DoctorProfileCreate(DoctorProfileBase): # For creating a new standalone doctor profile
    # Inherits fields from DoctorProfileBase (full_name, specialization, bio, contact_email, phone_number, notification_preferences)
    # user_id will be set from the authenticated user in the endpoint
    pass

class DoctorProfile(DoctorProfileBase): # Represents a standalone document in 'doctor_profiles' collection
    id: str # Firestore document ID (which will be the user_id)
    user_id: str # Link to the user document (same as id in this case)
    created_at: datetime
    updated_at: Optional[datetime] = None
    # notification_preferences is inherited from DoctorProfileBase
    # and will be handled as NotificationPreferences model or JSON string based on context

    class Config:
        populate_by_name = True # If you ever use _id as an alias for id
        # from_attributes = True # No longer needed

class DoctorProfileUpdate(BaseModel): # For updating a standalone doctor profile
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    contact_email: Optional[str] = None
    phone_number: Optional[str] = None
    notification_preferences: Optional[NotificationPreferences] = None


# --- PatientCase Schemas ---

class PatientCaseBase(BaseModel):
    name: str
    age: int
    gender: str
    severity: str
    symptoms: List[str]
    ai_recommendation: Optional[str] = None # AI rec can be added later
    status: str = "pending"
    doctor_id: Optional[str] = None # ID of the assigned doctor
    doctor_notes: Optional[str] = None
    doctor_recommendation: Optional[str] = None
    medical_history: Optional[str] = None
    # patient_id: str # ID of the patient user who created/owns this case

class PatientCaseCreate(PatientCaseBase):
    # Any specific fields for creation, patient_id would be set by current user
    pass

class PatientCaseInDB(PatientCaseBase): # Represents a PatientCase document in Firestore
    id: str = Field(..., alias="_id") # Firestore document ID
    timestamp: datetime = Field(default_factory=datetime.utcnow) # Creation timestamp
    updated_at: Optional[datetime] = None # Last update timestamp
    # patient_id: str # Ensure this is present

    class Config:
        populate_by_name = True
        # from_attributes = True # No longer needed

class PatientCaseResponse(PatientCaseInDB): # For API responses
    pass


class PatientCaseUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    severity: Optional[str] = None
    symptoms: Optional[List[str]] = None
    status: Optional[str] = None
    doctor_id: Optional[str] = None # Allow re-assigning or unassigning
    doctor_notes: Optional[str] = None
    doctor_recommendation: Optional[str] = None
    medical_history: Optional[str] = None


# --- ChatMessage Schemas (for subcollection patientCases/{caseId}/chats) ---

class ChatMessageBase(BaseModel):
    # patient_case_id: str # Implicit from subcollection path, but can be stored for denormalization
    sender_id: str # User ID of the sender (doctor or patient)
    sender_type: str  # "doctor", "patient", or "ai"
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageInDB(ChatMessageBase): # Represents a ChatMessage document in Firestore subcollection
    id: str = Field(..., alias="_id") # Firestore document ID
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    patient_case_id: Optional[str] = None # Store for easier queries if needed, though redundant in subcollection

    class Config:
        populate_by_name = True
        # from_attributes = True # No longer needed

class ChatMessageResponse(ChatMessageInDB): # For API responses
    pass


# --- AI Assistant ---
class AIAssistantRequest(BaseModel):
    prompt: Optional[str] = None # Make prompt optional if structured data is preferred
    patient_symptoms: List[str]
    patient_history: Optional[str] = None
    # Could add more structured fields here if the prompt is always similar
    # e.g., current_medications: Optional[List[str]] = None
    #       allergies: Optional[List[str]] = None
