
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

interface PatientHistoryProps {
  patientCaseId: string;
}

interface HistoryRecord {
  id: string;
  notes: string;
  diagnosis: string;
  treatment: string;
  timestamp: string;
}

const PatientHistory = ({ patientCaseId }: PatientHistoryProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['patient-history', patientCaseId],
    queryFn: async () => {
      try {
        // We need to add this endpoint to our FastAPI backend
        const response = await api.getPatientCase(patientCaseId);
        
        // For now, just return empty array or mock data
        // In a real implementation, you would fetch history records
        return response.medical_history 
          ? [{ 
              id: '1', 
              notes: response.medical_history,
              diagnosis: '',
              treatment: '', 
              timestamp: response.timestamp 
            }] 
          : [];
      } catch (error) {
        console.error("Error fetching patient history:", error);
        return [];
      }
    },
  });

  if (isLoading) return <div>Loading history...</div>;
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Patient History</h3>
      {history && history.length > 0 ? (
        history.map((record) => (
          <Card key={record.id} className="bg-muted/50">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <time dateTime={record.timestamp}>
                  {new Date(record.timestamp).toLocaleDateString()}
                </time>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {record.diagnosis && (
                <div>
                  <strong>Diagnosis:</strong> {record.diagnosis}
                </div>
              )}
              {record.treatment && (
                <div>
                  <strong>Treatment:</strong> {record.treatment}
                </div>
              )}
              {record.notes && (
                <div>
                  <strong>Notes:</strong> {record.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-muted-foreground">No previous records found.</p>
      )}
    </div>
  );
};

export default PatientHistory;
