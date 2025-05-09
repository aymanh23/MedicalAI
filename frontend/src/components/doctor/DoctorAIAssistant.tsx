
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";
import { apiClient } from '@/services/apiClient';

interface DoctorAIAssistantProps {
  patientSymptoms: string[];
  patientHistory?: string;
}

const DoctorAIAssistant: React.FC<DoctorAIAssistantProps> = ({ patientSymptoms, patientHistory }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a question for the AI assistant.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await apiClient.post('/ai-assistant', {
        prompt: prompt,
        patient_symptoms: patientSymptoms,
        patient_history: patientHistory || ''
      });

      setResponse(result.data.response || "I couldn't generate a response. Please try again.");
    } catch (error) {
      console.error("AI Assistant error:", error);
      toast({
        title: "Error",
        description: "Failed to get response from AI assistant. Please try again.",
        variant: "destructive",
      });
      setResponse("Error: Unable to get a response from the AI assistant.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-medical-teal/30">
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">AI Medical Assistant</h3>
          <p className="text-sm text-gray-500">
            Ask for help with diagnosis, treatment options, or medical research.
          </p>
        </div>
        
        {response && (
          <div className="mb-4 p-4 bg-gray-50 rounded-md border">
            <h4 className="font-medium mb-2 text-medical-blue">AI Response:</h4>
            <div className="text-sm whitespace-pre-wrap">
              {response}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              placeholder="Ask the AI assistant a question about this patient..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>Generating...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Ask AI
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DoctorAIAssistant;
