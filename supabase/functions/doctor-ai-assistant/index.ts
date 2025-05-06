
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
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    // Using Gemini Flash 1.5 model
    const model = genAI.getGenerativeModel({ model: "gemini-flash-1.5" });

    const { prompt, patientSymptoms, patientHistory } = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

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

    console.log("Sending prompt to Gemini API:", contextPrompt.substring(0, 100) + "...");
    
    try {
      const result = await model.generateContent(contextPrompt);
      const response = result.response;
      const text = response.text();

      console.log("Received response from Gemini API:", text.substring(0, 100) + "...");

      return new Response(
        JSON.stringify({ 
          response: text 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (generationError) {
      console.error("Gemini API error:", generationError);
      
      // Provide more details about the error and model information
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate AI response',
          details: `Gemini API error: ${generationError.message || "Unknown error"}`,
          modelInfo: "Attempted to use model: gemini-flash-1.5"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
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
