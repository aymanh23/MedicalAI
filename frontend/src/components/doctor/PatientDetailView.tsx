import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Mail, Calendar, Download } from 'lucide-react';
import { Patient, Report } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIChatPanel from './AIChatPanel';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const [activeTab, setActiveTab] = useState('report');
  const [reportContent, setReportContent] = useState<string>('');

  // Extract text content from PDF when fileUrl changes
  useEffect(() => {
    const extractPdfContent = async () => {
      if (!fileUrl) return;

      try {
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }

        setReportContent(fullText);
      } catch (error) {
        console.error('Error extracting PDF content:', error);
      }
    };

    extractPdfContent();
  }, [fileUrl]);

  const handleSave = () => {
    onSaveReview(caseData, diagnosis);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to cases
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">Patient Case Review</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button onClick={handleSave} className="bg-medical-blue hover:bg-medical-blue/90">
            Save & Send to Patient
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Patient Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Patient Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{patient.full_name}</h3>
                <p className="text-gray-500">{patient.age} years, {patient.gender}</p>
              </div>
              <div className="bg-medical-blue/10 text-medical-blue px-3 py-1 rounded-full text-sm">
                Case #{report.id.slice(0, 6)}
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{patient.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{patient.phone_number}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Submitted: {report.timestamp.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Doctor's Review Input */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Doctor's Review</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis & Prescription:</Label>
                <Textarea 
                  id="diagnosis"
                  placeholder="Enter your diagnosis and prescription details..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
                <p className="text-sm text-gray-500">
                  Please include your diagnosis and any prescriptions or recommendations for the patient.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Medical Report */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Medical Report</h3>
              {fileUrl && (
                <Button variant="outline" size="sm" className="flex items-center gap-2"
                  onClick={() => window.open(fileUrl, '_blank')}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </div>
            
            <div className="bg-gray-50 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
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
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel 
        patient={patient}
        report={{
          ...report,
          content: reportContent // Add the extracted PDF content to the report
        }}
        fileUrl={fileUrl}
      />
    </div>
  );
};

export default PatientDetailView;
