import { doc, getDoc } from 'firebase/firestore';
import { db } from '../integrations/firebase/firebaseConfig';

// This User interface should ideally be shared or imported from AuthContext
// For now, defining it here based on common needs and AuthContext structure
export interface UserProfile {
  id: string; // This will be the Firebase UID
  username?: string; // From Firestore
  email: string; // From Firebase Auth User
  role: 'doctor' | 'admin' | 'patient'; // From Firestore
  // Add other profile fields as needed
  [key: string]: any;
}

/**
 * Fetches a user's profile from the Firestore 'users' collection.
 * @param uid The Firebase User ID.
 * @returns The user profile data, or null if not found.
 */
export const getUserProfileFromFirestore = async (
  uid: string,
  email?: string
): Promise<UserProfile> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        id: uid,
        email: email || data.email,
        username: data.username || data.displayName || email?.split('@')[0] || 'Anonymous',
        role: data.role || 'patient',
        ...data,
      } as UserProfile;
    } else {
      return {
        id: uid,
        email: email || 'unknown',
        username: email?.split('@')[0] || 'Anonymous User',
        role: 'patient',
      };
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return {
      id: uid,
      email: email || 'unknown',
      username: email?.split('@')[0] || 'ErrorUser',
      role: 'patient',
    };
  }
}; 