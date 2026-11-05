import { GoogleGenAI } from '@google/genai';

export interface LeadData {
  name?: string;
  company?: string;
  niche?: string;
  email?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export interface PersonalizeEmailOptions {
  lead: LeadData;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface PersonalizedEmailResult {
  subject: string;
  body: string;
  isAiGenerated: boolean;
}

/**
 * Replaces common mustache-style placeholders like {{Name}}, {{Company}}, {{Niche}}
 * using provided lead data. Case-insensitive and handles common aliases.
 */
export function replacePlaceholders(template: string, lead: LeadData): string {
  if (!template) return '';

  return template.replace(/\{\{\s*([a-zA-Z0-9_\s]+)\s*\}\}/g, (_, key) => {
    const normalizedKey = key.trim().toLowerCase();

    // Direct key match
    for (const [k, v] of Object.entries(lead)) {
      if (k.toLowerCase() === normalizedKey && v !== undefined && v !== null) {
        return String(v);
      }
    }

    // Common synonyms
    if (normalizedKey === 'name' || normalizedKey === 'fullname' || normalizedKey === 'full name') {
      return lead.name || 'there';
    }
    if (
      normalizedKey === 'company' ||
      normalizedKey === 'business' ||
      normalizedKey === 'organization'
    ) {
      return lead.company || 'your company';
    }
    if (
      normalizedKey === 'niche' ||
      normalizedKey === 'industry' ||
      normalizedKey === 'category'
    ) {
      return lead.niche || 'your industry';
    }
    if (normalizedKey === 'email') {
      return lead.email || '';
    }
    if (normalizedKey === 'notes') {
      return lead.notes || '';
    }

    return '';
  });
}

/**
 * Generates a hyper-personalized cold outreach email tailored to the prospect's
 * business niche and details using Google Gemini (gemini-1.5-flash).
 *
 * If the API key is not configured or an error occurs during AI generation,
 * it falls back cleanly to the raw template with replaced placeholders.
 */
export async function generatePersonalizedEmail({
  lead,
  subjectTemplate,
  bodyTemplate,
}: PersonalizeEmailOptions): Promise<PersonalizedEmailResult> {
  const fallbackSubject = replacePlaceholders(subjectTemplate, lead);
  const fallbackBody = replacePlaceholders(bodyTemplate, lead);

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // If no Gemini API key is configured, fallback immediately
  if (!apiKey) {
    return {
      subject: fallbackSubject,
      body: fallbackBody,
      isAiGenerated: false,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Prospect Lead Details:
- Contact Name: ${lead.name || 'Business Owner'}
- Company/Business: ${lead.company || 'Your Business'}
- Niche/Industry: ${lead.niche || 'Local Business'}
${lead.notes ? `- Additional Context: ${lead.notes}` : ''}

Original User Template / Value Proposition:
"""
${fallbackBody}
"""

Instructions:
Write a personalized 3 to 4 sentence cold email tailored specifically to this prospect's niche and company.
Preserve the core value proposition of the template.
Avoid buzzwords, corporate fluff, or robotic greetings.
Finish with a low-friction question asking for a quick 5-minute chat.
Do not include a Subject line or placeholders like [Your Name].`;

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
    ];

    let aiGeneratedBody: string | undefined;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert B2B cold email copywriter. Write a concise, 3 to 4 sentence cold email tailored specifically to the prospect\'s business niche and details. Do not sound robotic or salesy. End with a low-friction question.',
            temperature: 0.7,
          },
        });

        const text = response.text?.trim();
        if (text && text.length > 20) {
          aiGeneratedBody = text;
          break;
        }
      } catch (modelErr) {
        // Try next candidate model
        continue;
      }
    }

    if (aiGeneratedBody && aiGeneratedBody.length > 20) {
      return {
        subject: fallbackSubject,
        body: aiGeneratedBody,
        isAiGenerated: true,
      };
    }

    return {
      subject: fallbackSubject,
      body: fallbackBody,
      isAiGenerated: false,
    };
  } catch (error) {
    console.warn('Gemini AI personalization failed, falling back to template:', error);
    return {
      subject: fallbackSubject,
      body: fallbackBody,
      isAiGenerated: false,
    };
  }
}

