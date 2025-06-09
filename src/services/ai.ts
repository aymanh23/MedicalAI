import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, you should use a proxy service
});

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const generateAIResponse = async (
  message: string,
  patientContext?: {
    name: string;
    age: number;
    gender: string;
    diagnosis?: string;
  },
  previousMessages: AIMessage[] = []
) => {
  try {
    const systemPrompt = `You are MedicalAI, an advanced medical assistant helping doctors analyze patient cases and provide insights. 
    ${patientContext ? `Current patient: ${patientContext.name}, ${patientContext.age} years old, ${patientContext.gender}` : ''}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...previousMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
};

export const analyzeImage = async (imageBase64: string, prompt: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

export const analyzePDF = async (pdfText: string, prompt: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant analyzing medical documents and reports."
        },
        {
          role: "user",
          content: `${prompt}\n\nDocument content:\n${pdfText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing PDF:', error);
    throw error;
  }
}; 