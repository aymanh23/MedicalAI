
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar } from '@/components/ui/avatar';

interface DoctorAIAssistantProps {
  patientSymptoms: string[];
  patientHistory?: string;
}

const DoctorAIAssistant = ({ patientSymptoms, patientHistory }: DoctorAIAssistantProps) => {
  const [question, setQuestion] = useState('');
  const [conversations, setConversations] = useState<{role: 'doctor' | 'ai'; content: string}[]>([]);
  const { toast } = useToast();
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const askAI = useMutation({
    mutationFn: async (prompt: string) => {
      const { data, error } = await supabase.functions.invoke('doctor-ai-assistant', {
        body: {
          prompt,
          patientSymptoms,
          patientHistory
        }
      });
      
      if (error) throw error;
      return data;
    },
    onMutate: (prompt) => {
      // Optimistically update UI
      setConversations(prev => [...prev, { role: 'doctor', content: prompt }]);
      setQuestion(''); // Clear input field
    },
    onSuccess: (data) => {
      setConversations(prev => [
        ...prev, 
        { role: 'ai', content: data.response }
      ]);
    },
    onError: (error) => {
      console.error('AI assistant error:', error);
      toast({
        title: "Error",
        description: "Failed to get a response from the AI assistant. Please try again.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    // Scroll to bottom when conversations update
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    askAI.mutate(question);
  };

  return (
    <Card className="flex flex-col h-[400px]">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium flex items-center">
          <Bot className="mr-2 h-5 w-5 text-primary" />
          Medical AI Assistant
        </h3>
        <p className="text-sm text-muted-foreground">
          Ask medical questions about this patient case
        </p>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {conversations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="mx-auto h-8 w-8 mb-2 text-muted-foreground/60" />
            <p>Ask the AI assistant a question about this patient's condition</p>
          </div>
        ) : (
          conversations.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'doctor' ? 'justify-end' : 'justify-start'} gap-2`}
            >
              {msg.role === 'ai' && (
                <Avatar className="h-8 w-8 bg-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </Avatar>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'doctor'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {askAI.isPending && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Generating response...</span>
          </div>
        )}
        <div ref={conversationEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a medical question about this patient..."
            className="min-h-[60px]"
          />
          <Button
            type="submit"
            disabled={!question.trim() || askAI.isPending}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default DoctorAIAssistant;
