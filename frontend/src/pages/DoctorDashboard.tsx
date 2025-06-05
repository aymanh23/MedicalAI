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
      setError('Failed to load pending reports. The system is creating necessary database indexes. Please try again in a few minutes.');
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
      await submitDoctorReview(
        caseData.patient.uid,  // patient ID
        caseData.report.id,    // report ID
        doctorNotes           // diagnosis
      );
      
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

  const filteredCases = cases.filter(caseData => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        caseData.patient.full_name.toLowerCase().includes(searchLower) ||
        caseData.patient.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <PageLayout>
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-medical-slate mb-6">Doctor Dashboard</h1>
          
          {selectedCase ? (
            <PatientDetailView 
              caseData={selectedCase}
              onBack={handleBackToList}
              onSaveReview={handleSaveReview}
            />
          ) : (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-6">
                <div className="flex items-center w-full md:w-auto">
                  <div className="relative flex-grow md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search patients..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="recent">
                    <SelectTrigger className="w-[180px] ml-2">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Sort by Recent</SelectItem>
                      <SelectItem value="name">Sort by Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                          className="mt-2"
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : filteredCases.length > 0 ? (
                  filteredCases.map(caseData => (
                    <PatientCaseCard 
                      key={caseData.report.id}
                      caseData={caseData}
                      onViewDetails={() => handleViewDetails(caseData)}
                    />
                  ))
                ) : (
                  <div className="col-span-3 py-12 text-center text-gray-500">
                    No pending reports to review.
                  </div>
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
