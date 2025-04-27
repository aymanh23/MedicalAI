
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PatientCase } from './PatientCaseCard';
import { AlertCircle, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PatientDetailViewProps {
  patientCase: PatientCase | null;
  onBack: () => void;
  onSaveReview: (id: string, doctorNotes: string, doctorRecommendation: string, severity: 'low' | 'medium' | 'high') => void;
}

const PatientDetailView: React.FC<PatientDetailViewProps> = ({ patientCase, onBack, onSaveReview }) => {
  const [doctorNotes, setDoctorNotes] = useState('');
  const [doctorRecommendation, setDoctorRecommendation] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>(patientCase?.severity || 'medium');

  if (!patientCase) return null;

  const severityConfig = {
    'low': {
      color: 'bg-green-100 text-green-800',
      badgeColor: 'bg-green-500',
      icon: <CheckCircle className="h-5 w-5" />
    },
    'medium': {
      color: 'bg-yellow-100 text-yellow-800',
      badgeColor: 'bg-yellow-500',
      icon: <Clock className="h-5 w-5" />
    },
    'high': {
      color: 'bg-red-100 text-red-800',
      badgeColor: 'bg-red-500',
      icon: <AlertCircle className="h-5 w-5" />
    }
  };

  const handleSave = () => {
    onSaveReview(patientCase.id, doctorNotes, doctorRecommendation, severity);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to cases
        </Button>
        <Badge className={severityConfig[severity].badgeColor}>
          <span className="flex items-center gap-1">
            {severityConfig[severity].icon}
            {severity.charAt(0).toUpperCase() + severity.slice(1)} Urgency
          </span>
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{patientCase.name}</h2>
            <p className="text-gray-500">{patientCase.age} years, {patientCase.gender}</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-700">Reported Symptoms:</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {patientCase.symptoms.map((symptom, index) => (
                <Badge key={index} variant="outline">{symptom}</Badge>
              ))}
            </div>
          </div>

          <Alert className={severityConfig[patientCase.severity].color}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>AI Triage Assessment</AlertTitle>
            <AlertDescription>{patientCase.aiRecommendation}</AlertDescription>
          </Alert>

          <div>
            <h3 className="font-semibold text-gray-700">Conversation Log:</h3>
            <div className="mt-2 bg-gray-50 p-4 rounded-md max-h-64 overflow-y-auto text-sm">
              <p className="text-medical-blue font-medium">AI: Hello! I'm your MedicalAI assistant. Please describe your symptoms, and I'll help assess your condition.</p>
              <p className="mt-2 text-gray-700">Patient: I've been experiencing a severe headache for the past 2 days. It's primarily on the right side of my head and feels like throbbing. I also feel nauseous at times, especially when I move suddenly.</p>
              <p className="mt-2 text-medical-blue font-medium">AI: Thank you for sharing that information. To better understand your condition, could you please tell me:
                
1. How long have you been experiencing these symptoms?
2. Have you taken any medication for this condition?
3. Do you have any pre-existing medical conditions?</p>
              <p className="mt-2 text-gray-700">Patient: The headache started about 48 hours ago. I've taken some over-the-counter pain relievers but they only help temporarily. I have a history of migraines but this feels different and more intense.</p>
              <p className="mt-2 text-medical-blue font-medium">AI: Based on the symptoms you've described, I've completed my initial assessment.

Let me provide you with some preliminary insights:

Your symptoms suggest a condition of moderate urgency. While this doesn't appear to be immediately life-threatening, I recommend scheduling an appointment with your doctor within the next 24-48 hours.

In the meantime:
- Stay hydrated
- Monitor your temperature
- Rest as much as possible
- Take over-the-counter pain relievers if needed for discomfort

Would you like me to prepare a detailed report for your doctor?</p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Doctor Review</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Update Urgency Assessment:</Label>
                <Select value={severity} onValueChange={(value: 'low' | 'medium' | 'high') => setSeverity(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select urgency level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Urgency</SelectItem>
                    <SelectItem value="medium">Medium Urgency</SelectItem>
                    <SelectItem value="high">High Urgency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
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
