import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, Paperclip, Maximize2, Minimize2, Image, Loader2 } from 'lucide-react';
import { Patient, Report } from '@/services/firebase';
import { generateAIResponse, analyzeImage, analyzePDF, AIMessage, PageContext } from '@/services/ai';
import { useToast } from '@/components/ui/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import { useLocation } from 'react-router-dom';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: string[];
}

interface AIChatPanelProps {
  patient?: Patient;
  report?: Report;
  fileUrl?: string;
}

const getCurrentPage = (pathname: string): PageContext => {
  if (pathname.includes('dashboard')) return 'doctor_dashboard';
  if (pathname.includes('records')) return 'patient_records';
  if (pathname.includes('imaging')) return 'medical_imaging';
  if (pathname.includes('lab')) return 'lab_results';
  if (pathname.includes('prescriptions')) return 'prescriptions';
  if (pathname.includes('appointments')) return 'appointments';
  if (pathname.includes('history')) return 'patient_history';
  return 'doctor_dashboard'; // default
};

const AIChatPanel: React.FC<AIChatPanelProps> = ({ patient, report, fileUrl }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const location = useLocation();
  const currentPage = getCurrentPage(location.pathname);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() && !fileInputRef.current?.files?.length) return;

    setIsLoading(true);
    const newMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      // Convert messages to AIMessage format
      const previousMessages: AIMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get AI response with enhanced context
      const aiResponseText = await generateAIResponse(
        input,
        'patient_review',
        {
          name: patient?.full_name || '',
          age: patient?.age || 0,
          gender: patient?.gender || '',
          diagnosis: report?.doctor_diagnosis,
          medicalHistory: patient?.medical_history,
          medications: patient?.current_medications,
          allergies: patient?.allergies,
          vitalSigns: patient?.vital_signs ? {
            bloodPressure: patient.vital_signs.blood_pressure,
            heartRate: patient.vital_signs.heart_rate,
            temperature: patient.vital_signs.temperature,
            oxygenSaturation: patient.vital_signs.oxygen_saturation
          } : undefined,
          reportContent: report?.content
        },
        previousMessages
      );

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseText || "I couldn't generate a response. Please try again.",
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // Create a message for the file upload
      const fileMessage: Message = {
        id: Date.now().toString(),
        content: `Analyzing ${file.name}...`,
        role: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fileMessage]);

      let analysisResult = '';
      
      if (file.type === 'application/pdf') {
        // Handle PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }

        analysisResult = await analyzePDF(
          fullText,
          "Please analyze this medical document and provide key insights.",
          'patient_review',
          {
            name: patient?.full_name || '',
            age: patient?.age || 0,
            gender: patient?.gender || '',
            diagnosis: report?.doctor_diagnosis,
            medicalHistory: patient?.medical_history,
            reportContent: report?.content
          }
        );
      } else if (file.type.startsWith('image/')) {
        // Handle Image
        const reader = new FileReader();
        const imageBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        analysisResult = await analyzeImage(
          imageBase64,
          "Please analyze this medical image and provide your observations.",
          'patient_review',
          {
            name: patient?.full_name || '',
            age: patient?.age || 0,
            gender: patient?.gender || '',
            diagnosis: report?.doctor_diagnosis,
            medicalHistory: patient?.medical_history,
            reportContent: report?.content
          }
        );
      }

      // Add AI response
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: analysisResult,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "Failed to analyze the file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Return null if we don't have both patient and report data
  if (!patient || !report) {
    return null;
  }

  const getContextualPlaceholder = () => {
    switch (currentPage) {
      case 'doctor_dashboard':
        return "Ask about patient overview or trends...";
      case 'patient_records':
        return "Ask about patient history or records...";
      case 'medical_imaging':
        return "Ask about medical images or upload for analysis...";
      case 'lab_results':
        return "Ask about lab results or trends...";
      case 'prescriptions':
        return "Ask about medications or interactions...";
      case 'appointments':
        return "Ask about scheduling or follow-ups...";
      case 'patient_history':
        return "Ask about patient history patterns...";
      default:
        return "Ask about the patient's case...";
    }
  };

  return (
    <Card className={`fixed bottom-4 right-4 flex flex-col bg-white shadow-xl transition-all duration-200 ease-in-out ${
      isExpanded ? 'w-[400px] h-[600px]' : 'w-[300px] h-[400px]'
    }`}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-medical-blue/5">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-medical-blue" />
          <div>
            <h3 className="font-semibold">MedicalAI Assistant</h3>
            <p className="text-xs text-gray-500">Analyzing Patient Case</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleExpand}>
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Context Badge */}
      <div className="px-3 py-2 bg-gray-50 border-b flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          Patient: {patient.full_name}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Case Review
        </Badge>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              I can help analyze the patient's case, suggest diagnoses, or answer any medical questions.
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'assistant'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-medical-blue text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.attachments?.map((attachment, index) => (
                  <img
                    key={index}
                    src={attachment}
                    alt="Attachment"
                    className="mt-2 rounded-md max-w-full"
                  />
                ))}
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
            placeholder={getContextualPlaceholder()}
            className="flex-1"
            disabled={isLoading}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Upload additional files • Ask for analysis • Get medical insights
        </p>
      </div>
    </Card>
  );
};

export default AIChatPanel; 