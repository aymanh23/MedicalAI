
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

    const { prompt, patientSymptoms, patientHistory } = await req.json();

    // Create context for the AI based on patient information
    const contextPrompt = `
You are a medical AI assistant helping a doctor review a patient case. Please provide concise, 
professional medical information based on your medical knowledge.

PATIENT INFORMATION:
- Symptoms: ${patientSymptoms.join(', ')}
${patientHistory ? `- Medical History: ${patientHistory}` : ''}

DOCTOR'S QUESTION: ${prompt}

Please provide a medically accurate response. If you're uncertain, indicate the limitations of your knowledge.
`;

    const result = await model.generateContent(contextPrompt);
    const response = result.response;
    const text = response.text();

    return new Response(
      JSON.stringify({ 
        response: text 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in AI assistant:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate AI response',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
