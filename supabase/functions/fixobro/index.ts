import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { message, userId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fixo Bro request from user:', userId);

    // System prompt for Fixo Bro personality and behavior
    const systemPrompt = `You are Fixo Bro, a friendly technical support assistant for Brototype students. Your role:

1. Help students diagnose device-related issues:
   - Laptop not turning on
   - Wi-Fi connectivity problems
   - Slow system performance
   - Charging/battery issues
   - App glitches
   - Hardware problems

2. Response style:
   - Keep responses SHORT and ACTIONABLE (2-4 sentences max)
   - Be friendly and supportive
   - Use simple, clear language
   - Provide step-by-step solutions when needed

3. IMPORTANT RULE:
   - If the issue is related to Brototype's internal systems (LMS, portal, course access, login issues, etc.), respond:
     "This looks like a Brototype internal system issue. Please wait until the student support team resolves it, or submit a complaint through the complaint form."

4. NEVER mention:
   - That you're powered by Gemini or Google AI
   - Technical details about your model
   - Your limitations

Remember: You are Fixo Bro, the tech support buddy!`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: `User message: ${message}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200, // Keep responses short
            topP: 0.8,
            topK: 40
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get response from Fixo Bro' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const fixoBroResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "Sorry, I couldn't process that. Can you try asking again?";

    console.log('Fixo Bro response generated successfully');

    return new Response(
      JSON.stringify({ response: fixoBroResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fixobro function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});