
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface TriageResultCardProps {
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  visible: boolean;
}

const TriageResultCard: React.FC<TriageResultCardProps> = ({ severity, recommendation, visible }) => {
  if (!visible) return null;
  
  const severityConfig = {
    'low': {
      title: 'Low Urgency',
      description: 'Your condition does not require immediate medical attention.',
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />
    },
    'medium': {
      title: 'Medium Urgency',
      description: 'Your condition requires medical attention soon, but is not an emergency.',
      color: 'bg-yellow-100 text-yellow-800',
      icon: <Clock className="h-5 w-5 text-yellow-600" />
    },
    'high': {
      title: 'High Urgency',
      description: 'Your condition requires immediate medical attention.',
      color: 'bg-red-100 text-red-800',
      icon: <AlertCircle className="h-5 w-5 text-red-600" />
    }
  };
  
  const config = severityConfig[severity];

  return (
    <Card className={`w-full shadow-md animate-fade-in ${visible ? 'block' : 'hidden'}`}>
      <CardHeader className={config.color}>
        <div className="flex items-center gap-2">
          {config.icon}
          <CardTitle>{config.title}</CardTitle>
        </div>
        <CardDescription className="text-inherit opacity-90">{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <h3 className="font-medium text-lg mb-2">Recommendation:</h3>
        <p className="text-gray-700">{recommendation}</p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <Button className="w-full sm:w-auto">Book Appointment</Button>
        <Button variant="outline" className="w-full sm:w-auto">Download Report</Button>
      </CardFooter>
    </Card>
  );
};

export default TriageResultCard;
