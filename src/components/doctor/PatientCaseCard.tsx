
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

export interface PatientCase {
  id: string;
  name: string;
  age: number;
  gender: string;
  severity: 'low' | 'medium' | 'high';
  symptoms: string[];
  aiRecommendation: string;
  timestamp: Date;
  status: 'pending' | 'reviewed';
}

interface PatientCaseCardProps {
  patientCase: PatientCase;
  onViewDetails: (id: string) => void;
}

const PatientCaseCard: React.FC<PatientCaseCardProps> = ({ patientCase, onViewDetails }) => {
  const severityConfig = {
    'low': {
      color: 'bg-green-100 text-green-800',
      badgeColor: 'bg-green-500',
      icon: <CheckCircle className="h-4 w-4 mr-1" />
    },
    'medium': {
      color: 'bg-yellow-100 text-yellow-800',
      badgeColor: 'bg-yellow-500',
      icon: <Clock className="h-4 w-4 mr-1" />
    },
    'high': {
      color: 'bg-red-100 text-red-800',
      badgeColor: 'bg-red-500',
      icon: <AlertCircle className="h-4 w-4 mr-1" />
    }
  };

  const config = severityConfig[patientCase.severity];

  return (
    <Card className="shadow-sm hover:shadow transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{patientCase.name}</CardTitle>
            <CardDescription>
              {patientCase.age} years, {patientCase.gender}
            </CardDescription>
          </div>
          <Badge className={config.badgeColor}>
            <span className="flex items-center">
              {config.icon}
              {patientCase.severity.charAt(0).toUpperCase() + patientCase.severity.slice(1)}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-500">Symptoms:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {patientCase.symptoms.map((symptom, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {symptom}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">AI Recommendation:</span>
          <p className="text-sm mt-1">{patientCase.aiRecommendation}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <span className="text-xs text-gray-500">
          Submitted: {patientCase.timestamp.toLocaleString()}
        </span>
        <Button size="sm" onClick={() => onViewDetails(patientCase.id)}>
          Review
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PatientCaseCard;
