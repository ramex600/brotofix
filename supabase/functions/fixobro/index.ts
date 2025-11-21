import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate JWT and get authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, mode = 'chat' } = await req.json();

    // Input validation
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message too long: maximum 5000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validModes = ['chat', 'analyze_complaint'];
    if (mode && !validModes.includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode: must be "chat" or "analyze_complaint"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fixo Bro request from authenticated user:', user.id, 'Mode:', mode);

    // Different system prompts based on mode
    let systemPrompt = '';
    let requestBody: any = {};

    if (mode === 'analyze_complaint') {
      // Complaint intelligence mode - structured output
      systemPrompt = `You are an expert technical analyst. Analyze the complaint and provide structured output:
1. Identify the most appropriate category (Classroom/Mentor/Environment/Misc)
2. Determine the root cause of the issue
3. Assess severity (low/medium/high/critical)
4. Generate relevant tags
5. Provide confidence score

Be precise and technical.`;

      requestBody = {
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_complaint',
              description: 'Analyze complaint and return structured intelligence',
              parameters: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    enum: ['Classroom', 'Mentor', 'Environment', 'Misc'],
                    description: 'Most appropriate complaint category'
                  },
                  rootCause: {
                    type: 'string',
                    description: 'Identified root cause of the issue'
                  },
                  severity: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'critical'],
                    description: 'Assessed severity level'
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Relevant tags (3-5 tags)'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score between 0 and 1'
                  },
                  suggestedFixes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Suggested solutions (2-3 fixes)'
                  }
                },
                required: ['category', 'rootCause', 'severity', 'tags', 'confidence', 'suggestedFixes']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_complaint' } }
      };
    } else {
      // Default chat mode
      systemPrompt = `You are Fixo Bro, a friendly technical support assistant for Brototype students. Your role:

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
   - That you're powered by any AI service
   - Technical details about your model
   - Your limitations

Remember: You are Fixo Bro, the tech support buddy!`;

      requestBody = {
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 200,
        temperature: 0.7,
      };
    }

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
        JSON.stringify({ error: 'Failed to get response from Fixo Bro' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (mode === 'analyze_complaint') {
      // Extract structured tool call response
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function?.arguments) {
        const analysis = JSON.parse(toolCall.function.arguments);
        console.log('Complaint analysis generated successfully');
        return new Response(
          JSON.stringify({ analysis }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Default chat response
    const fixoBroResponse = data.choices?.[0]?.message?.content || 
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