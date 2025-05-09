
import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter } from 'lucide-react';
import PatientCaseCard, { PatientCase } from '@/components/doctor/PatientCaseCard';
import PatientDetailView from '@/components/doctor/PatientDetailView';
import { useToast } from '@/components/ui/use-toast';

const DoctorDashboard = () => {
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample patient cases data
  const [patientCases, setPatientCases] = useState<PatientCase[]>([
    {
      id: '1',
      name: 'John Doe',
      age: 45,
      gender: 'Male',
      severity: 'high',
      symptoms: ['Chest pain', 'Shortness of breath', 'Dizziness'],
      aiRecommendation: 'Seek immediate medical attention. Symptoms suggest possible cardiac event.',
      timestamp: new Date(),
      status: 'pending'
    },
    {
      id: '2',
      name: 'Jane Smith',
      age: 35,
      gender: 'Female',
      severity: 'medium',
      symptoms: ['Headache', 'Nausea', 'Light sensitivity'],
      aiRecommendation: 'Schedule an appointment within 24-48 hours. Symptoms suggest possible migraine.',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      status: 'pending'
    },
    {
      id: '3',
      name: 'Robert Johnson',
      age: 28,
      gender: 'Male',
      severity: 'low',
      symptoms: ['Sore throat', 'Mild fever', 'Cough'],
      aiRecommendation: 'Rest and hydrate. Follow up if symptoms worsen or persist beyond 3-5 days.',
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      status: 'pending'
    },
    {
      id: '4',
      name: 'Maria Garcia',
      age: 52,
      gender: 'Female',
      severity: 'medium',
      symptoms: ['Lower back pain', 'Numbness in leg', 'Difficulty walking'],
      aiRecommendation: 'Schedule an appointment within 24-48 hours. Symptoms suggest possible sciatica.',
      timestamp: new Date(Date.now() - 10800000), // 3 hours ago
      status: 'reviewed'
    }
  ]);

  const handleViewDetails = (id: string) => {
    setSelectedPatientId(id);
  };

  const handleBackToList = () => {
    setSelectedPatientId(null);
  };

  const handleSaveReview = (id: string, doctorNotes: string, doctorRecommendation: string, severity: 'low' | 'medium' | 'high') => {
    // In a real application, this would send data to a backend API
    const updatedCases = patientCases.map(patientCase => {
      if (patientCase.id === id) {
        return {
          ...patientCase,
          status: 'reviewed' as const,
          severity
        };
      }
      return patientCase;
    });
    
    setPatientCases(updatedCases);
    setSelectedPatientId(null);
    
    toast({
      title: "Review saved successfully",
      description: `Patient case has been updated and notification sent to the patient.`,
    });
  };

  const filteredCases = patientCases.filter(patientCase => {
    // Filter by status
    if (filterStatus !== 'all' && patientCase.status !== filterStatus) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !patientCase.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const selectedPatient = patientCases.find(patientCase => patientCase.id === selectedPatientId) || null;

  return (
    <PageLayout>
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-medical-slate mb-6">Doctor Dashboard</h1>
          
          {selectedPatientId ? (
            <PatientDetailView 
              patientCase={selectedPatient}
              onBack={handleBackToList}
              onSaveReview={handleSaveReview}
            />
          ) : (
            <>
              <Tabs defaultValue="all" onValueChange={value => setFilterStatus(value)}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-6">
                  <TabsList>
                    <TabsTrigger value="all">All Cases</TabsTrigger>
                    <TabsTrigger value="pending">Pending Review</TabsTrigger>
                    <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                  </TabsList>
                  
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
                    <Select defaultValue="urgency">
                      <SelectTrigger className="w-[180px] ml-2">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgency">Sort by Urgency</SelectItem>
                        <SelectItem value="recent">Sort by Recent</SelectItem>
                        <SelectItem value="name">Sort by Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <TabsContent value="all" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCases.map(patientCase => (
                      <PatientCaseCard 
                        key={patientCase.id}
                        patientCase={patientCase} 
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                    {filteredCases.length === 0 && (
                      <div className="col-span-3 py-12 text-center text-gray-500">
                        No patient cases match your current filters.
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="pending" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCases.map(patientCase => (
                      <PatientCaseCard 
                        key={patientCase.id}
                        patientCase={patientCase} 
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                    {filteredCases.length === 0 && (
                      <div className="col-span-3 py-12 text-center text-gray-500">
                        No pending patient cases match your current filters.
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="reviewed" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCases.map(patientCase => (
                      <PatientCaseCard 
                        key={patientCase.id}
                        patientCase={patientCase} 
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                    {filteredCases.length === 0 && (
                      <div className="col-span-3 py-12 text-center text-gray-500">
                        No reviewed patient cases match your current filters.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default DoctorDashboard;
