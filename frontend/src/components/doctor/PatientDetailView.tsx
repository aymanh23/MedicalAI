import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Patient, Report } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CaseData {
  patient: Patient;
  report: Report;
  fileUrl: string;
}

interface PatientDetailViewProps {
  caseData: CaseData;
  onBack: () => void;
  onSaveReview: (caseData: CaseData, diagnosis: string) => void;
}

const PatientDetailView: React.FC<PatientDetailViewProps> = ({ caseData, onBack, onSaveReview }) => {
  const [diagnosis, setDiagnosis] = useState('');
  const { patient, report, fileUrl } = caseData;

  const handleSave = () => {
    onSaveReview(caseData, diagnosis);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to cases
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{patient.full_name}</h2>
              <p className="text-gray-500">{patient.age} years, {patient.gender}</p>
              <p className="text-sm text-gray-400 mt-2">Submitted: {report.timestamp.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Contact Information</h3>
              <p className="text-sm">Email: {patient.email}</p>
              <p className="text-sm">Phone: {patient.phone_number}</p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Medical Report</h3>
            <div className="aspect-[16/9] w-full bg-gray-100 rounded-lg overflow-hidden">
              {fileUrl ? (
                <iframe 
                  src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full"
                  title="Medical Report"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No medical report available
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Doctor's Review</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis & Prescription:</Label>
                <Textarea 
                  id="diagnosis"
                  placeholder="Enter your diagnosis and prescription details..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="min-h-[200px]"
                />
                <p className="text-sm text-gray-500">
                  Please include your diagnosis and any prescriptions or recommendations for the patient.
                </p>
              </div>
            </div>
          </Card>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button onClick={handleSave}>Save & Send to Patient</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailView;
