import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { PatientCase } from './PatientCaseCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PatientDetailViewProps {
  patientCase: PatientCase | null;
  onBack: () => void;
  onSaveReview: (id: string, doctorNotes: string, doctorRecommendation: string) => void;
}

const PatientDetailView: React.FC<PatientDetailViewProps> = ({ patientCase, onBack, onSaveReview }) => {
  const [doctorNotes, setDoctorNotes] = useState('');
  const [doctorRecommendation, setDoctorRecommendation] = useState('');

  if (!patientCase) return null;

  const handleSave = () => {
    onSaveReview(patientCase.id, doctorNotes, doctorRecommendation);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to cases
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{patientCase.name}</h2>
            <p className="text-gray-500">{patientCase.age} years, {patientCase.gender}</p>
            <p className="text-sm text-gray-400 mt-2">Submitted: {patientCase.timestamp.toLocaleString()}</p>
          </div>
        </Card>

        <div className="space-y-6">
          <Tabs defaultValue="review" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>
            
            <TabsContent value="review">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Doctor Review</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recommendation">Doctor's Recommendation:</Label>
                    <Textarea 
                      id="recommendation"
                      placeholder="Enter your professional recommendation"
                      value={doctorRecommendation}
                      onChange={(e) => setDoctorRecommendation(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Clinical Notes:</Label>
                    <Textarea 
                      id="notes"
                      placeholder="Enter any additional notes"
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      className="min-h-32"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
          
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
