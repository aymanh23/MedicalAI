import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import PatientCaseCard from '@/components/doctor/PatientCaseCard';
import PatientDetailView from '@/components/doctor/PatientDetailView';
import { useToast } from '@/components/ui/use-toast';
import { fetchPendingReports, submitDoctorReview } from '@/services/firebase';
import { Patient, Report } from '@/services/firebase';
import { Button } from '@/components/ui/button';

interface CaseData {
  patient: Patient;
  report: Report;
  fileUrl: string;
}

const DoctorDashboard = () => {
  const { toast } = useToast();
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cases, setCases] = useState<CaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingReports();
  }, []);

  const loadPendingReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const pendingReports = await fetchPendingReports();
      setCases(pendingReports);
    } catch (error) {
      console.error('Error loading pending reports:', error);
      setError('Failed to load pending reports. Please try again in a few minutes.');
      toast({
        title: "Error",
        description: "Failed to load pending reports. Please try again in a few minutes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (caseData: CaseData) => {
    setSelectedCase(caseData);
  };

  const handleBackToList = () => {
    setSelectedCase(null);
  };

  const handleSaveReview = async (caseData: CaseData, doctorNotes: string) => {
    try {
      const pathParts = caseData.report.path.split('/');
      const patientId = pathParts[1]; // patients/{patientId}/reports/{reportId}
      const reportId = pathParts[3];

      await submitDoctorReview(patientId, reportId, doctorNotes);
      
      // Update local state
      setCases(prevCases => prevCases.filter(c => c.report.id !== caseData.report.id));
      setSelectedCase(null);
      
      toast({
        title: "Review saved successfully",
        description: "The patient will be notified of your diagnosis.",
      });
    } catch (error) {
      console.error('Error saving review:', error);
      toast({
        title: "Error",
        description: "Failed to save review. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Filter cases based on search query
  const filteredCases = cases.filter(caseData => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      caseData.patient.full_name.toLowerCase().includes(searchLower) ||
      caseData.patient.email.toLowerCase().includes(searchLower);
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && !caseData.report.reviewed;
  });

  return (
    <PageLayout>
      <section className="container py-8">
        <div className="flex flex-col space-y-8">
          {selectedCase ? (
            <PatientDetailView
              caseData={selectedCase}
              onBack={handleBackToList}
              onSaveReview={handleSaveReview}
            />
          ) : (
            <>
              <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0">
                <div>
                  <h1 className="text-3xl font-bold text-medical-slate">Patient Cases</h1>
                  <p className="text-gray-500">Review and manage patient cases</p>
                </div>
                <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search cases..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select
                    value={filterStatus}
                    onValueChange={setFilterStatus}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cases</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-3 py-12 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-blue"></div>
                      <p className="text-gray-500">Loading pending reports...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="col-span-3 py-12">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <p className="text-red-800">{error}</p>
                        <Button 
                          variant="outline" 
                          onClick={loadPendingReports}
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : filteredCases.length === 0 ? (
                  <div className="col-span-3 py-12 text-center text-gray-500">
                    No pending reports found.
                  </div>
                ) : (
                  filteredCases.map(caseData => (
                    <PatientCaseCard
                      key={caseData.report.id}
                      caseData={caseData}
                      onViewDetails={() => handleViewDetails(caseData)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default DoctorDashboard;
