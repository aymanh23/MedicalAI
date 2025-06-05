from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth as firebase_auth, credentials
from google.cloud import firestore # To type hint the db client
from typing import Optional

import schemas # Your Pydantic models
from database import get_firestore_db # Your new dependency to get Firestore client

# This scheme can be used to extract the token from the Authorization header
# The tokenUrl doesn't strictly mean we have a /token endpoint generating these tokens anymore,
# as Firebase ID tokens are issued by Firebase itself.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") # Or consider tokenUrl=""

def get_user_profile(db: firestore.Client, user_id: str) -> Optional[schemas.UserInDB]:
    """Fetches user profile data from Firestore using their Firebase UID."""
    user_ref = db.collection(u'users').document(user_id)
    user_doc = user_ref.get()
    if user_doc.exists:
        user_data = user_doc.to_dict()
        user_data['id'] = user_doc.id
        return schemas.UserInDB(**user_data)
    return None

async def get_current_firebase_user(
    token: str = Depends(oauth2_scheme),
    db: firestore.Client = Depends(get_firestore_db)
) -> schemas.UserResponse: # Return our application-specific user model
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials - Invalid Firebase ID token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        firebase_uid = decoded_token.get("uid")
        if not firebase_uid:
            raise credentials_exception
        
        # At this point, the Firebase user is authenticated.
        # Now, fetch their profile from your Firestore 'users' collection.
        user_profile = get_user_profile(db, firebase_uid)
        
        if user_profile is None:
            # This case means a Firebase user exists, but they don't have a profile in your app's DB.
            # This could happen if user creation in your DB failed after Firebase signup,
            # or if you allow Firebase users who haven't completed a profile setup in your app.
            # You might want to create a basic profile here, or deny access.
            # For now, we'll treat it as an unauthorized user for simplicity.
            # Alternatively, you could return the decoded_token data directly if you don't need a DB profile for all routes.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User profile not found in application database."
            )
        
        # Convert UserInDB to UserResponse if needed, or ensure UserResponse has all necessary fields
        # For simplicity, assuming UserInDB can be used where UserResponse is expected if fields match
        # or convert explicitly: return schemas.UserResponse(**user_profile.model_dump())
        return schemas.UserResponse(**user_profile.model_dump())

    except firebase_auth.InvalidIdTokenError:
        raise credentials_exception
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e: # Catch other potential errors during token verification or DB fetch
        print(f"An unexpected error occurred during authentication: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred during authentication.",
        )

async def get_current_active_user(
    current_user: schemas.UserResponse = Depends(get_current_firebase_user)
) -> schemas.UserResponse:
    if current_user.disabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

# You might also need a way to create a user profile in your Firestore 'users' collection
# when a new user signs up via Firebase on the client-side. This is often done by 
# the client calling a specific backend endpoint after successful Firebase signup.
# Example (to be placed in main.py or a users router):
# @app.post("/users/create_profile", response_model=schemas.UserResponse)
# async def create_user_profile_endpoint(
#     user_create_data: schemas.UserCreate, # Or a specific profile creation schema
#     id_token: str = Header(None, alias="Authorization"), # Expect Firebase ID token
#     db: firestore.Client = Depends(get_firestore_db)
# ):
#     if not id_token or not id_token.startswith("Bearer "):
#         raise HTTPException(status_code=401, detail="Not authenticated")
#     token = id_token.split("Bearer ")[1]
#     try:
#         decoded_token = firebase_auth.verify_id_token(token)
#         firebase_uid = decoded_token.get("uid")
#         email = decoded_token.get("email")
#         # Check if profile already exists
#         existing_profile = get_user_profile(db, firebase_uid)
#         if existing_profile:
#             raise HTTPException(status_code=400, detail="User profile already exists")
#
#         # Create user profile in Firestore, linking it with Firebase UID
#         user_data_for_db = schemas.UserInDB(
#             _id=firebase_uid, # Use Firebase UID as document ID
#             username=user_create_data.username, # Or derive from email/other source
#             email=email,
#             full_name=user_create_data.full_name,
#             role=user_create_data.role,
#             disabled=False,
#             hashed_password=None, # Not storing password hash if using Firebase Auth
#             doctor_profile=user_create_data.doctor_profile if user_create_data.role == "doctor" else None
#         )
#         await db.collection(u'users').document(firebase_uid).set(user_data_for_db.model_dump(by_alias=True))
#         return schemas.UserResponse(**user_data_for_db.model_dump(by_alias=True))
#     except firebase_auth.FirebaseAuthError as e:
#         raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {e}")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Profile creation failed: {e}")
