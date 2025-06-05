import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/integrations/firebase/firebaseConfig';
import { getUserProfileFromFirestore, UserProfile } from '@/services/userService';

// Keep existing User interface or adapt UserProfile from userService if more suitable
// For now, we'll use UserProfile and ensure it has all necessary fields.
// If your components rely on the specific structure of the old User interface,
// you might need to map UserProfile to that structure.
interface User extends UserProfile {} // Using UserProfile as the base

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>; // Changed from username to email
  logout: () => Promise<void>; // Changed to async to align with firebaseSignOut
  firebaseUser: FirebaseUser | null; // Optionally expose Firebase user object
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => false,
  logout: async () => {},
  firebaseUser: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    console.log('AuthContext: useEffect triggered. Setting initial isLoading to true.');
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log('AuthContext: onAuthStateChanged callback fired. Firebase user:', fbUser);
      setFirebaseUser(fbUser);
      if (fbUser) {
        console.log('AuthContext: User is signed in. UID:', fbUser.uid);
        try {
          const profile = await getUserProfileFromFirestore(fbUser.uid, fbUser.email);
          console.log('AuthContext: Profile fetched from Firestore:', profile);
          if (profile) {
            setUser(profile);
          } else {
            console.warn('AuthContext: Firestore profile is null or undefined. Setting default user.');
            setUser({
              id: fbUser.uid,
              email: fbUser.email || 'N/A',
              role: 'patient', 
              username: fbUser.displayName || fbUser.email?.split('@')[0] || 'Anonymous',
            });
          }
        } catch (error) {
          console.error('AuthContext: Error fetching user profile from Firestore:', error);
          // Potentially set a minimal user or an error state here
          setUser({ // Fallback user on error
              id: fbUser.uid,
              email: fbUser.email || 'N/A',
              role: 'patient', 
              username: 'Error User',
            });
        }
      } else {
        console.log('AuthContext: User is signed out.');
        setUser(null);
      }
      console.log('AuthContext: Setting isLoading to false.');
      setIsLoading(false); // This is a key line
    });

    return () => {
      console.log('AuthContext: useEffect cleanup. Unsubscribing from onAuthStateChanged.');
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user state
      // setIsLoading(false) will also be handled by onAuthStateChanged effect
        return true;
    } catch (error) {
      console.error('Firebase Login error:', error);
      setIsLoading(false); // Ensure loading is stopped on error
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting user state to null
      // setIsLoading(false) will also be handled by onAuthStateChanged effect
    } catch (error) {
      console.error('Firebase Logout error:', error);
      setIsLoading(false); // Ensure loading is stopped on error
    }
  };

  return (
    <AuthContext.Provider value={{ 
        isAuthenticated: !!user, 
        isLoading, 
        user, 
        login, 
        logout, 
        firebaseUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
