import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { Patient, Report } from '@/services/firebase';

interface PatientDetailViewProps {
  caseData: {
    patient: Patient;
    report: Report;
    fileUrl: string;
  };
  onBack: () => void;
  onSaveReview: (caseData: any, diagnosis: string) => void;
}

const PatientDetailView: React.FC<PatientDetailViewProps> = ({ caseData, onBack, onSaveReview }) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { patient, report, fileUrl } = caseData;

  const handleSave = async () => {
    if (!diagnosis.trim()) {
      return; // Don't submit empty diagnosis
    }
    
    setIsSaving(true);
    try {
      await onSaveReview(caseData, diagnosis);
    } finally {
      setIsSaving(false);
    }
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
              {fileUrl.endsWith('.pdf') ? (
                <iframe 
                  src={fileUrl} 
                  className="w-full h-full"
                  title="Medical Report"
                />
              ) : (
                <img 
                  src={fileUrl} 
                  alt="Medical Report" 
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Doctor's Review</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="diagnosis" className="block text-sm font-medium mb-2">
                  Diagnosis & Recommendations
                </label>
                <Textarea
                  id="diagnosis"
                  placeholder="Enter your diagnosis, recommendations, and any prescriptions..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="min-h-[200px]"
                  disabled={isSaving}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleSave}
                disabled={!diagnosis.trim() || isSaving}
              >
                {isSaving ? "Saving Review..." : "Save Review"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailView;
