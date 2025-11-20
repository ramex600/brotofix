import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageMimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing screenshot with Gemini Vision...');

    const systemPrompt = `You are an expert technical support analyst. Analyze this screenshot and provide:

1. Extract all visible text (OCR)
2. Identify any error messages or warnings
3. Determine the problem type (Hardware/Software/Network/Browser/System)
4. Suggest 2-3 specific fixes
5. Assess severity (low/medium/high/critical)

Return a structured analysis focusing on technical accuracy.`;

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: systemPrompt 
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this screenshot and provide technical diagnosis.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${imageMimeType};base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze screenshot' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content || 'Unable to analyze screenshot';

    // Parse the response to extract structured data
    const analysis = {
      rawAnalysis: analysisText,
      detectedText: extractSection(analysisText, ['text', 'ocr', 'visible']),
      errorMessages: extractSection(analysisText, ['error', 'warning', 'alert']),
      problemType: extractProblemType(analysisText),
      suggestedFixes: extractFixes(analysisText),
      severity: extractSeverity(analysisText),
      confidence: 0.85,
      analyzedAt: new Date().toISOString()
    };

    console.log('Screenshot analysis completed successfully');

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-screenshot function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions to parse AI response
function extractSection(text: string, keywords: string[]): string {
  const lines = text.split('\n');
  const relevantLines: string[] = [];
  let capturing = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (keywords.some(kw => lowerLine.includes(kw))) {
      capturing = true;
      relevantLines.push(line);
    } else if (capturing && line.trim() && !line.startsWith('#')) {
      relevantLines.push(line);
    } else if (capturing && line.trim() === '') {
      break;
    }
  }

  return relevantLines.join('\n').trim() || 'No specific details detected';
}

function extractProblemType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('hardware')) return 'Hardware';
  if (lower.includes('network') || lower.includes('connection')) return 'Network';
  if (lower.includes('browser')) return 'Browser';
  if (lower.includes('software') || lower.includes('application')) return 'Software';
  return 'System';
}

function extractFixes(text: string): string[] {
  const lines = text.split('\n');
  const fixes: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      (trimmed.match(/^\d+\./) || trimmed.startsWith('-')) &&
      (trimmed.toLowerCase().includes('fix') || 
       trimmed.toLowerCase().includes('try') ||
       trimmed.toLowerCase().includes('check') ||
       trimmed.toLowerCase().includes('restart') ||
       trimmed.toLowerCase().includes('update'))
    ) {
      fixes.push(trimmed.replace(/^\d+\.\s*|-\s*/, ''));
    }
  }

  return fixes.length > 0 ? fixes.slice(0, 3) : ['Check system settings', 'Restart the application', 'Contact support if issue persists'];
}

function extractSeverity(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('critical') || lower.includes('severe')) return 'critical';
  if (lower.includes('high')) return 'high';
  if (lower.includes('medium') || lower.includes('moderate')) return 'medium';
  return 'low';
}
