
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    disabled = Column(Boolean, default=False)
    role = Column(String)  # "doctor" or "patient"

    # Relationships
    doctor_cases = relationship("PatientCase", back_populates="doctor", foreign_keys="PatientCase.doctor_id")
    doctor_chats = relationship("Chat", back_populates="doctor", foreign_keys="Chat.doctor_id")

class PatientCase(Base):
    __tablename__ = "patient_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    severity = Column(String)
    symptoms = Column(Text)  # Stored as JSON string
    ai_recommendation = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="pending")
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    doctor_notes = Column(Text, nullable=True)
    doctor_recommendation = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)

    # Relationships
    doctor = relationship("User", back_populates="doctor_cases", foreign_keys=[doctor_id])
    chats = relationship("Chat", back_populates="patient_case")

class Chat(Base):
    __tablename__ = "chats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_case_id = Column(UUID(as_uuid=True), ForeignKey("patient_cases.id"))
    sender_type = Column(String)  # "doctor" or "ai"
    content = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    patient_case = relationship("PatientCase", back_populates="chats")
    doctor = relationship("User", back_populates="doctor_chats")
