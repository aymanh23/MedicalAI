// src/lib/firebase.ts (or wherever your firebase.ts lives)
import { db, storage } from '../lib/firebase';
import { auth } from '../integrations/firebase/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  collectionGroup,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

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
}

export const checkDoctorRole = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No user is signed in');
      return false;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.error('User document not found');
      return false;
    }

    const userData = userDoc.data();
    return userData.role === 'doctor';
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
    console.log('Checking doctor role...');
    const isDoctor = await checkDoctorRole();
    if (!isDoctor) {
      throw new Error('User is not authorized as a doctor');
    }

    console.log('Fetching pending reports...');

    // Query all "reports" subcollections where "reviewed" === false
    const reportsQuery = query(
      collectionGroup(db, 'reports'),
      where('reviewed', '==', false)
    );

    console.log('Executing reports query...');
    const reportsSnapshot = await getDocs(reportsQuery);
    console.log(`Found ${reportsSnapshot.docs.length} pending reports`);

    const results = await Promise.all(
      reportsSnapshot.docs.map(async (reportDoc) => {
        console.log(`Processing report ${reportDoc.id}`);
        const reportData = reportDoc.data();
        console.log('Report data:', reportData);

        // Extract patientId from the Firestore path: "patients/{patientId}/reports/{reportId}"
        const patientId = reportDoc.ref.path.split('/')[1];
        console.log(`Fetching patient data for ID: ${patientId}`);

        // Look up the patient document by matching the "uid" field to patientId
        const patientQuerySnapshot = await getDocs(
          query(
            collection(db, 'patients'),
            where('uid', '==', patientId)
          )
        );

        if (patientQuerySnapshot.empty) {
          console.error(`Patient not found for report ${reportDoc.id}`);
          throw new Error(`Patient not found for report ${reportDoc.id}`);
        }

        const patientDoc = patientQuerySnapshot.docs[0];
        const patientData = patientDoc.data();
        console.log('Patient data:', patientData);

        // Build the Report object
        const report: Report = {
          id: reportDoc.id,
          path: `patients/${patientId}/reports/${reportDoc.id}`,
          reviewed: reportData.reviewed || false,
          timestamp: reportData.timestamp?.toDate() || new Date(),
          doctor_diagnosis: reportData.doctor_diagnosis
        };

        // Build the Patient object
        const patient: Patient = {
          id: patientDoc.id,
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

        // === NEW: List all files under "patients/{patientId}/reports/" ===
        const storageFolder = `patients/${patientId}/reports`;
        console.log(`Listing files in storage folder: ${storageFolder}`);
        const folderRef = ref(storage, storageFolder);
        const listResult = await listAll(folderRef);

        if (listResult.items.length === 0) {
          console.warn(`No files found under ${storageFolder}`);
          return {
            patient,
            report,
            fileUrl: '' // or handle this case as you prefer
          };
        }

        // Pick the first file. If you expect multiple files, iterate or filter accordingly.
        const firstFileRef = listResult.items[0];
        const fileUrl = await getDownloadURL(firstFileRef);
        console.log('File URL obtained:', fileUrl);

        return {
          patient,
          report,
          fileUrl
        };
      })
    );

    console.log('Final results:', results);
    return results;
  } catch (error) {
    console.error('Error fetching pending reports:', error);
    throw error;
  }
};

export const fetchReviewedReports = async (): Promise<{
  patient: Patient;
  report: Report;
  fileUrl: string;
}[]> => {
  try {
    console.log('Checking doctor role...');
    const isDoctor = await checkDoctorRole();
    if (!isDoctor) {
      throw new Error('User is not authorized as a doctor');
    }

    console.log('Fetching reviewed reports...');

    // Query all "reports" subcollections where "reviewed" === true
    const reportsQuery = query(
      collectionGroup(db, 'reports'),
      where('reviewed', '==', true)
    );

    console.log('Executing reports query...');
    const reportsSnapshot = await getDocs(reportsQuery);
    console.log(`Found ${reportsSnapshot.docs.length} reviewed reports`);

    const results = await Promise.all(
      reportsSnapshot.docs.map(async (reportDoc) => {
        console.log(`Processing report ${reportDoc.id}`);
        const reportData = reportDoc.data();
        console.log('Report data:', reportData);

        // Extract patientId from the Firestore path: "patients/{patientId}/reports/{reportId}"
        const patientId = reportDoc.ref.path.split('/')[1];
        console.log(`Fetching patient data for ID: ${patientId}`);

        // Look up the patient document by matching the "uid" field to patientId
        const patientQuerySnapshot = await getDocs(
          query(
            collection(db, 'patients'),
            where('uid', '==', patientId)
          )
        );

        if (patientQuerySnapshot.empty) {
          console.error(`Patient not found for report ${reportDoc.id}`);
          throw new Error(`Patient not found for report ${reportDoc.id}`);
        }

        const patientDoc = patientQuerySnapshot.docs[0];
        const patientData = patientDoc.data();
        console.log('Patient data:', patientData);

        // Build the Report object
        const report: Report = {
          id: reportDoc.id,
          path: `patients/${patientId}/reports/${reportDoc.id}`,
          reviewed: reportData.reviewed || false,
          timestamp: reportData.timestamp?.toDate() || new Date(),
          doctor_diagnosis: reportData.doctor_diagnosis
        };

        // Build the Patient object
        const patient: Patient = {
          id: patientDoc.id,
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
        const storageFolder = `patients/${patientId}/reports`;
        console.log(`Listing files in storage folder: ${storageFolder}`);
        const folderRef = ref(storage, storageFolder);
        const listResult = await listAll(folderRef);

        if (listResult.items.length === 0) {
          console.warn(`No files found under ${storageFolder}`);
          return {
            patient,
            report,
            fileUrl: ''
          };
        }

        const firstFileRef = listResult.items[0];
        const fileUrl = await getDownloadURL(firstFileRef);
        console.log('File URL obtained:', fileUrl);

        return {
          patient,
          report,
          fileUrl
        };
      })
    );

    console.log('Final results:', results);
    return results;
  } catch (error) {
    console.error('Error fetching reviewed reports:', error);
    throw error;
  }
};

export const submitDoctorReview = async (
  patientId: string,
  reportId: string,
  diagnosis: string
): Promise<void> => {
  try {
    console.log(`Submitting review for patient ${patientId}, report ${reportId}`);
    
    // Verify we have all required data
    if (!patientId || !reportId || !diagnosis) {
      throw new Error('Missing required data for review submission');
    }

    // Get reference to the report document
    const reportRef = doc(db, 'patients', patientId, 'reports', reportId);
    
    // Update the document with the diagnosis
    await updateDoc(reportRef, {
      doctor_diagnosis: diagnosis,
      reviewed: true,
      reviewedAt: Timestamp.now()
    });
    
    console.log('Review submitted successfully');
  } catch (error) {
    console.error('Error submitting doctor review:', error);
    throw error;
  }
};

export const subscribeToReports = (
  onPendingUpdate: (reports: { patient: Patient; report: Report; fileUrl: string; }[]) => void,
  onReviewedUpdate: (reports: { patient: Patient; report: Report; fileUrl: string; }[]) => void
) => {
  // Query for pending reports
  const pendingQuery = query(
    collectionGroup(db, 'reports'),
    where('reviewed', '==', false)
  );

  // Query for reviewed reports
  const reviewedQuery = query(
    collectionGroup(db, 'reports'),
    where('reviewed', '==', true)
  );

  // Helper function to process report documents
  const processReportDocs = async (reportDocs: any[]) => {
    const results = await Promise.all(
      reportDocs.map(async (reportDoc) => {
        const reportData = reportDoc.data();
        const patientId = reportDoc.ref.path.split('/')[1];

        // Get patient data
        const patientQuerySnapshot = await getDocs(
          query(
            collection(db, 'patients'),
            where('uid', '==', patientId)
          )
        );

        if (patientQuerySnapshot.empty) {
          console.error(`Patient not found for report ${reportDoc.id}`);
          return null;
        }

        const patientDoc = patientQuerySnapshot.docs[0];
        const patientData = patientDoc.data();

        // Build the Report object
        const report: Report = {
          id: reportDoc.id,
          path: `patients/${patientId}/reports/${reportDoc.id}`,
          reviewed: reportData.reviewed || false,
          timestamp: reportData.timestamp?.toDate() || new Date(),
          doctor_diagnosis: reportData.doctor_diagnosis
        };

        // Build the Patient object
        const patient: Patient = {
          id: patientDoc.id,
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

        // Get file URL
        const storageFolder = `patients/${patientId}/reports`;
        const folderRef = ref(storage, storageFolder);
        const listResult = await listAll(folderRef);

        let fileUrl = '';
        if (listResult.items.length > 0) {
          const firstFileRef = listResult.items[0];
          fileUrl = await getDownloadURL(firstFileRef);
        }

        return {
          patient,
          report,
          fileUrl
        };
      })
    );

    return results.filter(result => result !== null);
  };

  // Set up listeners
  const pendingUnsubscribe = onSnapshot(pendingQuery, async (snapshot) => {
    const reports = await processReportDocs(snapshot.docs);
    onPendingUpdate(reports);
  }, (error) => {
    console.error("Error listening to pending reports:", error);
  });

  const reviewedUnsubscribe = onSnapshot(reviewedQuery, async (snapshot) => {
    const reports = await processReportDocs(snapshot.docs);
    onReviewedUpdate(reports);
  }, (error) => {
    console.error("Error listening to reviewed reports:", error);
  });

  // Return unsubscribe functions
  return () => {
    pendingUnsubscribe();
    reviewedUnsubscribe();
  };
};
