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

export type PageContext = 
  | 'doctor_dashboard'
  | 'patient_records'
  | 'medical_imaging'
  | 'lab_results'
  | 'prescriptions'
  | 'appointments'
  | 'patient_history'
  | 'patient_review';

const getContextPrompt = (
  page: PageContext,
  patientContext?: {
    name: string;
    age: number;
    gender: string;
    diagnosis?: string;
    medicalHistory?: string[];
    medications?: string[];
    allergies?: string[];
    vitalSigns?: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number;
      oxygenSaturation?: number;
    };
    reportContent?: string;
  }
) => {
  const basePrompt = `You are MedicalAI, an advanced medical assistant helping healthcare professionals. You have extensive knowledge of medical terminology, procedures, diagnostics, and treatment protocols. You follow medical ethics and privacy standards.

${patientContext ? `Current Patient Context:
- Name: ${patientContext.name}
- Age: ${patientContext.age}
- Gender: ${patientContext.gender}
${patientContext.diagnosis ? `- Current Diagnosis: ${patientContext.diagnosis}` : ''}
${patientContext.medicalHistory ? `- Medical History: ${patientContext.medicalHistory.join(', ')}` : ''}
${patientContext.medications ? `- Current Medications: ${patientContext.medications.join(', ')}` : ''}
${patientContext.allergies ? `- Allergies: ${patientContext.allergies.join(', ')}` : ''}
${patientContext.vitalSigns ? `- Latest Vital Signs:
  • BP: ${patientContext.vitalSigns.bloodPressure || 'N/A'}
  • HR: ${patientContext.vitalSigns.heartRate || 'N/A'} bpm
  • Temp: ${patientContext.vitalSigns.temperature || 'N/A'}°C
  • O2 Sat: ${patientContext.vitalSigns.oxygenSaturation || 'N/A'}%` : ''}

${patientContext.reportContent ? `Current Medical Report Content:
${patientContext.reportContent}` : ''}` : ''}`;

  const pageSpecificPrompts = {
    doctor_dashboard: `
You are assisting with the doctor's dashboard overview. You can help with:
- Interpreting patient vital trends
- Highlighting critical patient updates
- Suggesting follow-up actions
- Providing quick clinical decision support
- Summarizing daily patient status`,

    patient_records: `
You are helping review patient records. You can assist with:
- Analyzing medical history patterns
- Identifying potential risk factors
- Suggesting preventive measures
- Highlighting important medical history points
- Cross-referencing current symptoms with past conditions`,

    medical_imaging: `
You are assisting with medical imaging analysis. You can help with:
- Providing preliminary image observations
- Highlighting areas of interest
- Comparing with previous imaging results
- Suggesting additional views or imaging studies
- Explaining imaging findings in clinical context`,

    lab_results: `
You are helping interpret laboratory results. You can assist with:
- Analyzing test results
- Identifying abnormal values
- Suggesting follow-up tests
- Correlating results with clinical presentation
- Tracking result trends over time`,

    prescriptions: `
You are assisting with prescription management. You can help with:
- Checking drug interactions
- Suggesting dosage adjustments
- Providing medication alternatives
- Highlighting potential side effects
- Recommending monitoring parameters`,

    appointments: `
You are helping manage patient appointments. You can assist with:
- Prioritizing urgent cases
- Suggesting follow-up intervals
- Recommending specialist referrals
- Planning treatment schedules
- Coordinating care timing`,

    patient_history: `
You are helping review patient history. You can assist with:
- Identifying risk factors
- Suggesting preventive measures
- Highlighting family history patterns
- Analyzing lifestyle factors
- Recommending screening tests`,

    patient_review: `
You are assisting with the current patient case review. You can help with:
- Analyzing the medical report content
- Suggesting potential diagnoses based on symptoms and findings
- Recommending additional tests or examinations if needed
- Providing treatment recommendations
- Highlighting important findings from the report
- Suggesting appropriate prescriptions and dosages
- Identifying potential contraindications
- Providing evidence-based treatment guidelines
- Recommending follow-up care plans`
  };

  return `${basePrompt}\n\n${pageSpecificPrompts[page]}`;
};

export const generateAIResponse = async (
  message: string,
  page: PageContext,
  patientContext?: {
    name: string;
    age: number;
    gender: string;
    diagnosis?: string;
    medicalHistory?: string[];
    medications?: string[];
    allergies?: string[];
    vitalSigns?: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number;
      oxygenSaturation?: number;
    };
    reportContent?: string;
  },
  previousMessages: AIMessage[] = []
) => {
  try {
    const systemPrompt = getContextPrompt(page, patientContext);

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
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
};

export const analyzeImage = async (
  imageBase64: string,
  prompt: string,
  page: PageContext,
  patientContext?: {
    name: string;
    age: number;
    gender: string;
    diagnosis?: string;
    medicalHistory?: string[];
    reportContent?: string;
  }
) => {
  try {
    const systemPrompt = getContextPrompt(page, patientContext);

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
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
      max_tokens: 1000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

export const analyzePDF = async (
  pdfText: string,
  prompt: string,
  page: PageContext,
  patientContext?: {
    name: string;
    age: number;
    gender: string;
    diagnosis?: string;
    medicalHistory?: string[];
    reportContent?: string;
  }
) => {
  try {
    const systemPrompt = getContextPrompt(page, patientContext);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `${prompt}\n\nDocument content:\n${pdfText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing PDF:', error);
    throw error;
  }
}; 