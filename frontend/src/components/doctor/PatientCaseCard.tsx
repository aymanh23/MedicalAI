import React from 'react';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle } from 'lucide-react';
import { CaseData } from '@/services/firebase';

interface PatientCaseCardProps {
  caseData: CaseData;
  onViewDetails: () => void;
}

const PatientCaseCard: React.FC<PatientCaseCardProps> = ({ caseData, onViewDetails }) => {
  const { patient, report } = caseData;

  const StatusBadge = () => {
    if (!report.reviewed) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0">
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Pending Review
          </span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 border-0">
        <span className="flex items-center">
          <CheckCircle className="h-4 w-4 mr-1" />
          Reviewed
        </span>
      </Badge>
    );
  };

  return (
    <Card className="shadow-sm hover:shadow transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{patient.full_name}</CardTitle>
            <CardDescription>
              {patient.age} years, {patient.gender}
            </CardDescription>
          </div>
          <StatusBadge />
        </div>
      </CardHeader>
      <CardFooter className="flex justify-between pt-2">
        <span className="text-xs text-gray-500">
          Submitted: {report.timestamp.toLocaleString()}
        </span>
        <Button size="sm" onClick={onViewDetails}>
          {report.reviewed ? 'View Details' : 'Review'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PatientCaseCard;
