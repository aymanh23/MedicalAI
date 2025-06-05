import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/integrations/firebase/firebaseConfig'; // Corrected path

// This User interface should ideally be shared or imported from AuthContext
// For now, defining it here based on common needs and AuthContext structure
export interface UserProfile {
  id: string; // This will be the Firebase UID
  username?: string; // From Firestore
  email: string; // From Firebase Auth User
  role: 'doctor' | 'admin' | 'patient'; // From Firestore
  // Add other profile fields as needed
}

/**
 * Fetches a user's profile from the Firestore 'users' collection.
 * @param uid The Firebase User ID.
 * @returns The user profile data, or null if not found.
 */
export const getUserProfileFromFirestore = async (uid: string, email: string | null): Promise<UserProfile | null> => {
  if (!db) {
    console.error("Firestore database instance (db) is not available...");
    return { id: uid, email: email || 'unknown', role: 'patient', username: email?.split('@')[0] || 'Anonymous' };
  }
  try {
    let foundDocIdInTest: string | null = null; // Variable to store ID from test

    // --- TEMPORARY TEST --- 
    console.log("userService: --- TEMPORARY TEST: Trying to list first document from 'users' collection ---");
    try {
      const usersCollectionRef = collection(db, 'users');
      const q = query(usersCollectionRef, limit(1)); // Let's try to get the specific doc if possible
      // const q = query(usersCollectionRef, where(documentId(), '==', uid), limit(1)); // More targeted test
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        querySnapshot.forEach(doc => {
          console.log("userService: --- TEMPORARY TEST: Found document in 'users':", doc.id, "Data:", doc.data());
          foundDocIdInTest = doc.id; // Store the ID
        });
      } else {
        console.log("userService: --- TEMPORARY TEST: 'users' collection appears empty or target doc not found via query.");
      }
    } catch (testError) {
      console.error("userService: --- TEMPORARY TEST: Error during list attempt:", testError);
    }
    // --- END TEMPORARY TEST ---

    // Log and compare the UIDs
    console.log(`userService: UID parameter for getDoc: '${uid}' (length ${uid.length})`);
    if (foundDocIdInTest) {
      console.log(`userService: UID found in TEMPORARY TEST: '${foundDocIdInTest}' (length ${foundDocIdInTest.length})`);
      console.log(`userService: Are UIDs identical? (param === testFound): ${uid === foundDocIdInTest}`);
    }

    const userDocRef = doc(db, 'users', uid); // uid here is the parameter passed to the function
    console.log(`userService: Attempting to get document at path: users/${uid}`);
    const userDocSnap = await getDoc(userDocRef);
    console.log(`userService: Document snapshot exists? ${userDocSnap.exists()}`, userDocSnap);

    if (userDocSnap.exists()) {
      console.log("userService: Document exists. Data:", userDocSnap.data());
      const data = userDocSnap.data();
      return {
        id: uid,
        email: email || data.email,
        username: data.username || data.displayName || email?.split('@')[0] || 'Anonymous',
        role: data.role || 'patient',
        ...data,
      } as UserProfile;
    } else {
      console.warn(`userService: Document at users/${uid} does NOT exist. Returning a default profile.`);
      return {
        id: uid,
        email: email || 'unknown',
        username: email?.split('@')[0] || 'Anonymous User',
        role: 'patient',
      };
    }
  } catch (error) {
    console.error("userService: Error fetching user profile from Firestore:", error);
    return {
      id: uid,
      email: email || 'unknown',
      username: email?.split('@')[0] || 'ErrorUser',
      role: 'patient',
    };
  }
}; 