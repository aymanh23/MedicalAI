import React from 'react';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle } from 'lucide-react';

export interface PatientCase {
  id: string;
  name: string;
  age: number;
  gender: string;
  timestamp: Date;
  status: 'pending' | 'reviewed';
}

interface PatientCaseCardProps {
  patientCase: PatientCase;
  onViewDetails: (id: string) => void;
}

const PatientCaseCard: React.FC<PatientCaseCardProps> = ({ patientCase, onViewDetails }) => {
  const statusConfig = {
    'pending': {
      color: 'bg-yellow-100 text-yellow-800',
      icon: <Clock className="h-4 w-4 mr-1" />
    },
    'reviewed': {
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle className="h-4 w-4 mr-1" />
    }
  };

  const config = statusConfig[patientCase.status];

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
          <Badge className={`${config.color} border-0`}>
            <span className="flex items-center">
              {config.icon}
              {patientCase.status.charAt(0).toUpperCase() + patientCase.status.slice(1)}
            </span>
          </Badge>
        </div>
      </CardHeader>
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
