
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  created_at: string;
}

const PatientHistory = ({ patientCaseId }: PatientHistoryProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['patient-history', patientCaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_history')
        .select('*')
        .eq('patient_case_id', patientCaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HistoryRecord[];
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
                <time dateTime={record.created_at}>
                  {new Date(record.created_at).toLocaleDateString()}
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
