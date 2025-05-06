
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: uuid.UUID
    disabled: Optional[bool] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

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
    id: uuid.UUID
    name: str
    age: int
    gender: str
    severity: str
    symptoms: List[str]
    ai_recommendation: str
    timestamp: datetime
    status: str
    doctor_id: Optional[uuid.UUID] = None
    doctor_notes: Optional[str] = None
    doctor_recommendation: Optional[str] = None
    medical_history: Optional[str] = None

    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    patient_case_id: uuid.UUID
    sender_type: str
    content: str

    class Config:
        from_attributes = True

class ChatMessageResponse(ChatMessage):
    id: uuid.UUID
    timestamp: datetime
    doctor_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

class AIAssistantRequest(BaseModel):
    prompt: str
    patient_symptoms: List[str]
    patient_history: Optional[str] = None
