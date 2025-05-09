
import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Message {
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface SymptomChatProps {
  onTriageComplete: (severity: 'low' | 'medium' | 'high', recommendation: string) => void;
}

const SymptomChat: React.FC<SymptomChatProps> = ({ onTriageComplete }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      content: 'Hello! I\'m your MedicalAI assistant. Please describe your symptoms, and I\'ll help assess your condition.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [conversationStage, setConversationStage] = useState<'initial' | 'follow-up' | 'complete'>('initial');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Simulate AI response
  const simulateAiResponse = (userMessage: string) => {
    setIsAiTyping(true);
    
    // Simulate network delay
    const delay = Math.floor(Math.random() * 1000) + 1000;
    
    setTimeout(() => {
      let aiResponse = '';
      
      // Different responses based on conversation stage
      if (conversationStage === 'initial') {
        aiResponse = `Thank you for sharing that information. To better understand your condition, could you please tell me:
        
1. How long have you been experiencing these symptoms?
2. Have you taken any medication for this condition?
3. Do you have any pre-existing medical conditions?`;
        setConversationStage('follow-up');
      } else if (conversationStage === 'follow-up') {
        aiResponse = `Based on the symptoms you've described, I've completed my initial assessment. 
        
Let me provide you with some preliminary insights:

Your symptoms suggest a condition of moderate urgency. While this doesn't appear to be immediately life-threatening, I recommend scheduling an appointment with your doctor within the next 24-48 hours.

In the meantime:
- Stay hydrated
- Monitor your temperature
- Rest as much as possible
- Take over-the-counter pain relievers if needed for discomfort

Would you like me to prepare a detailed report for your doctor?`;
        setConversationStage('complete');
        
        // Trigger the triage completion
        setTimeout(() => {
          onTriageComplete('medium', 'Schedule an appointment within 24-48 hours');
        }, 2000);
      }
      
      setMessages(prev => [...prev, {
        sender: 'ai',
        content: aiResponse,
        timestamp: new Date()
      }]);
      
      setIsAiTyping(false);
    }, delay);
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    const newMessage: Message = {
      sender: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    
    simulateAiResponse(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="flex flex-col h-[600px] border shadow-md overflow-hidden">
      <div className="bg-medical-blue p-4 text-white">
        <h2 className="font-semibold">Symptom Assessment</h2>
        <p className="text-sm opacity-90">Share your symptoms for AI-powered analysis</p>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={cn(
                "flex", 
                message.sender === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div 
                className={cn(
                  message.sender === 'user' ? "chat-bubble-user" : "chat-bubble-ai"
                )}
              >
                <div className="whitespace-pre-line">{message.content}</div>
                <div 
                  className={cn(
                    "text-xs mt-1",
                    message.sender === 'user' ? "text-gray-500" : "text-white/80"
                  )}
                >
                  {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
          
          {isAiTyping && (
            <div className="flex justify-start">
              <div className="chat-bubble-ai">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="p-4 border-t bg-white">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon">
            <Upload className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your symptoms..."
            disabled={isAiTyping || conversationStage === 'complete'}
            className="flex-grow"
          />
          <Button onClick={handleSendMessage} disabled={!input.trim() || isAiTyping || conversationStage === 'complete'}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SymptomChat;
