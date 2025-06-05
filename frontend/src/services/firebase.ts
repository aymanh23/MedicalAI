import { db, storage } from '../integrations/firebase/firebaseConfig';
import { auth } from '../integrations/firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  Timestamp,
  collectionGroup,
  getDoc
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  age: number;
  gender: string;
  email: string;
  phone_number: string;
  createdAt: Date;
  uid: string;
}

export interface Report {
  id: string;
  path: string;
  reviewed: boolean;
  timestamp: Date;
  doctor_diagnosis?: string;
  reviewedAt?: Date;
  doctorId?: string;
}

// Cache doctor role check result
let isDoctorCache: boolean | null = null;
let lastDoctorCheckTime = 0;
const DOCTOR_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const checkDoctorRole = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    // Check cache first
    const now = Date.now();
    if (isDoctorCache !== null && (now - lastDoctorCheckTime) < DOCTOR_CACHE_DURATION) {
      return isDoctorCache;
    }
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    if (!userData.role) return false;
    
    // Update cache
    isDoctorCache = userData.role === 'doctor';
    lastDoctorCheckTime = now;
    
    return isDoctorCache;
  } catch (error) {
    console.error('Error checking doctor role:', error);
    return false;
  }
};

export const fetchPendingReports = async (): Promise<{
  patient: Patient;
  report: Report;
  fileUrl: string;
}[]> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('You must be signed in to fetch reports');
    }

    const isDoctor = await checkDoctorRole();
    if (!isDoctor) {
      throw new Error('You must be a doctor to fetch reports');
    }

    const patientCache = new Map<string, any>();
    
    const reportsQuery = query(
      collectionGroup(db, 'reports'),
      where('reviewed', '==', false)
    );
    
    const reportsSnapshot = await getDocs(reportsQuery);

    // Batch get all patient documents
    const patientIds = new Set(
      reportsSnapshot.docs.map(doc => doc.ref.path.split('/')[1])
    );

    const patientPromises = Array.from(patientIds).map(async patientId => {
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      if (patientDoc.exists()) {
        patientCache.set(patientId, patientDoc.data());
      }
      return patientDoc;
    });

    await Promise.all(patientPromises);
    
    // Process all reports in parallel
    const results = await Promise.all(
      reportsSnapshot.docs.map(async (reportDoc) => {
        const reportData = reportDoc.data();
        const patientId = reportDoc.ref.path.split('/')[1];
        const patientData = patientCache.get(patientId);

        if (!patientData) return null;

        const report: Report = {
          id: reportDoc.id,
          path: reportDoc.ref.path,
          reviewed: reportData.reviewed || false,
          timestamp: reportData.timestamp?.toDate() || new Date(),
          doctor_diagnosis: reportData.doctor_diagnosis,
          reviewedAt: reportData.reviewedAt?.toDate(),
          doctorId: reportData.doctorId
        };
        
        const patient: Patient = {
          id: patientId,
          first_name: patientData.first_name,
          last_name: patientData.last_name,
          full_name: patientData.full_name,
          age: patientData.age,
          gender: patientData.gender,
          email: patientData.email,
          phone_number: patientData.phone_number,
          createdAt: patientData.createdAt?.toDate() || new Date(),
          uid: patientId
        };

        // Get the file URL from storage
        const storageRef = ref(storage, `patients/${patientId}/reports/${reportDoc.id}`);
        const fileUrl = await getDownloadURL(storageRef).catch(() => '#');

        return {
          patient,
          report,
          fileUrl
        };
      })
    );

    return results.filter(result => result !== null);
  } catch (error) {
    console.error('Error fetching pending reports:', error);
    throw error;
  }
};

export const submitDoctorReview = async (
  patientId: string,
  reportId: string,
  diagnosis: string
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('You must be signed in to submit a review');
    }

    const isDoctor = await checkDoctorRole();
    if (!isDoctor) {
      throw new Error('You must be a doctor to submit a review');
    }

    const reportRef = doc(db, 'patients', patientId, 'reports', reportId);
    
    await updateDoc(reportRef, {
      doctor_diagnosis: diagnosis,
      reviewed: true,
      reviewedAt: Timestamp.now(),
      doctorId: user.uid
    });
  } catch (error) {
    console.error('Error submitting doctor review:', error);
    throw error;
  }
}; 