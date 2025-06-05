import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the path to the service account key from an environment variable
# In production or Docker, set this environment variable to the path of your key file.
# For local development, you might place 'serviceAccountKey.json' in the 'backend' directory.
SERVICE_ACCOUNT_KEY_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "./serviceAccountKey.json")

try:
    # Initialize Firebase Admin SDK
    # Check if the app is already initialized to prevent re-initialization errors
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
    
    print("Firebase Admin SDK initialized successfully.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    # Depending on your error handling strategy, you might want to raise the exception
    # or exit the application if Firebase is critical.
    # For now, we'll just print the error.
    # raise e # Uncomment to propagate the error

# Dependency to get the Firestore client
def get_firestore_db():
    """
    Returns a Firestore client instance.
    Ensure Firebase Admin SDK is initialized before calling this.
    """
    try:
        return firestore.client()
    except Exception as e:
        print(f"Error getting Firestore client: {e}")
        # Handle appropriately, maybe raise an HTTPException if in a request context
        raise

# Example of how you might use it in FastAPI (you'll integrate this into your routes)
# from fastapi import Depends
#
# @app.get("/items/")
# async def read_items(db: firestore.Client = Depends(get_firestore_db)):
#     # Your Firestore operations here
#     items_ref = db.collection(u'your_collection_name')
#     docs = items_ref.stream()
#     items = [doc.to_dict() for doc in docs]
#     return items
