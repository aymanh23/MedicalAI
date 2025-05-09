
import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import SymptomChat from '@/components/patient/SymptomChat';
import TriageResultCard from '@/components/patient/TriageResultCard';
import { Button } from '@/components/ui/button';
import { FileText, Heart, Clock } from 'lucide-react';

const Index = () => {
  const [triageComplete, setTriageComplete] = useState(false);
  const [triageResult, setTriageResult] = useState<{
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>({
    severity: 'medium',
    recommendation: '',
  });

  const handleTriageComplete = (severity: 'low' | 'medium' | 'high', recommendation: string) => {
    setTriageResult({
      severity,
      recommendation,
    });
    setTriageComplete(true);
  };

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-medical-light to-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-medical-slate mb-4">
            AI-Powered Medical Triage Assistant
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
            Describe your symptoms and get instant AI-powered assessment to determine 
            if you need to see a doctor.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="bg-medical-blue hover:bg-medical-blue/90">
              Get Started
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-8">
              Chat with our AI Medical Assistant
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <SymptomChat onTriageComplete={handleTriageComplete} />
              </div>
              
              <div className="lg:col-span-2 space-y-6">
                <TriageResultCard 
                  severity={triageResult.severity}
                  recommendation={triageResult.recommendation}
                  visible={triageComplete}
                />
                
                {!triageComplete && (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">How It Works</h3>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="mt-1 bg-medical-blue rounded-full p-1 text-white">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium">Describe your symptoms</span>
                          <p className="text-gray-600 text-sm">Share your symptoms in detail with our AI assistant</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-1 bg-medical-teal rounded-full p-1 text-white">
                          <Heart className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium">Get AI assessment</span>
                          <p className="text-gray-600 text-sm">Our AI will analyze your symptoms and provide recommendations</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-1 bg-medical-orange rounded-full p-1 text-white">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium">Doctor review</span>
                          <p className="text-gray-600 text-sm">A doctor will review your case and provide medical advice</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center mb-12">How MedicalAI Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-medical-blue/10 text-medical-blue mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-medium mb-2">Symptom Analysis</h3>
              <p className="text-gray-600">
                Our AI analyzes your symptoms using advanced medical knowledge to provide preliminary insights.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-medical-teal/10 text-medical-teal mb-4">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-medium mb-2">Triage Assessment</h3>
              <p className="text-gray-600">
                Get an instant assessment of your condition's urgency and personalized care recommendations.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-medical-orange/10 text-medical-orange mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-medium mb-2">Doctor Review</h3>
              <p className="text-gray-600">
                Medical professionals review AI recommendations, ensuring accurate and reliable guidance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Index;
