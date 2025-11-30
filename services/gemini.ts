import { GoogleGenAI } from "@google/genai";

// Accept either standard process.env.API_KEY or the user's GEMINI_API_KEY
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

// --- AGENT PROMPTS ---

const PLANNING_PROMPT = `
You are the **Planning Agent**. Your goal is to interpret the user's request and create a structured plan for a single-page website.

**Capabilities:**
1. Identify sections: Hero, Features, Testimonials, Contact, Gallery, etc.
2. **AI Chatbot**: If the user asks for a "chatbot", "AI agent", "support bot", or similar, explicitly include an "AI Chat Widget" in the plan.
3. **Box Editing**: If the user references "Box X", identify which section they mean to modify.

Return a concise JSON object summarizing the requirements.
`;

const CODING_PROMPT = `
You are the **Code Agent**. You are an expert Tailwind CSS and HTML developer.
Your task is to generate the FULL HTML string for a single-page website based on the Plan.

**STRICT RULES:**
1. **Framework**: Use Tailwind CSS via CDN.
2. **Responsiveness**: Mobile-first design.
3. **Box System**: Wrap every major element (Section, H1, H2, P, Button, Img, Div container) with \`data-vibe-box="N"\` where N is a unique sequential number starting from 1.
4. **Images**: Use \`<img src="..." data-image-prompt="Detailed description..." data-vibe-box="N" />\`.
   - The Image Agent will replace these with real Gemini-generated images.
5. **AI Chatbot**: If the Plan includes a "Chatbot":
   - Add a fixed-position floating action button (bottom-right).
   - Add a simple chat window UI (hidden by default, toggled by the button).
   - Style it to look professional (e.g., "Chat with us").
   - *Do not* implement complex backend logic, just the HTML/CSS/JS for the UI.
6. **Output**: Return raw HTML string only. No markdown.

**CONTEXT:**
Previous HTML: {PREVIOUS_HTML}
User Request: {USER_REQUEST}
Plan: {PLAN}
`;

/**
 * Orchestrates the multi-agent generation process.
 */
export const generateWebsite = async (
  userRequest: string,
  currentHtml: string | null,
  onStatusUpdate: (status: string) => void
): Promise<string> => {
  
  if (!apiKey) throw new Error("Missing API_KEY");

  // 1. Planning Agent
  onStatusUpdate("Planning Agent: Analyzing request...");
  
  const planResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction: PLANNING_PROMPT,
        thinkingConfig: { thinkingBudget: 1024 } // Give it a bit of thinking room
    },
    contents: [
        { role: 'user', parts: [{ text: `User request: ${userRequest}. Current context: ${currentHtml ? 'Editing existing site' : 'New site'}` }] }
    ]
  });
  
  const plan = planResponse.text || "Update the website based on user request.";
  console.log("Plan:", plan);

  // 2. Code Agent
  onStatusUpdate("Design & Code Agents: Writing HTML & CSS...");

  const codeResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction: CODING_PROMPT.replace('{PREVIOUS_HTML}', currentHtml || "None").replace('{USER_REQUEST}', userRequest).replace('{PLAN}', plan),
        temperature: 0.7,
    },
    contents: [
      { role: 'user', parts: [{ text: "Generate the website HTML now." }] }
    ]
  });

  let html = codeResponse.text || "";

  // Cleanup markdown if present
  html = html.replace(/```html/g, '').replace(/```/g, '');

  // 3. Image Agent (Real Gemini Generation)
  onStatusUpdate("Image Agent: Scanning for images...");
  
  // Parse HTML to find images requesting generation
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imagesToGenerate = Array.from(doc.querySelectorAll('img[data-image-prompt]'));

  if (imagesToGenerate.length > 0) {
      onStatusUpdate(`Image Agent: Generating ${imagesToGenerate.length} custom images with Gemini 3 Pro...`);
      
      // Generate images in parallel
      await Promise.all(imagesToGenerate.map(async (img) => {
          const prompt = img.getAttribute('data-image-prompt');
          if (prompt) {
              try {
                  const imageUrl = await generateCustomImage(prompt);
                  if (imageUrl) {
                      img.setAttribute('src', imageUrl);
                      img.removeAttribute('data-image-prompt');
                  }
              } catch (e) {
                  console.error(`Failed to generate image for prompt: ${prompt}`, e);
              }
          }
      }));
      
      // Serialize back to HTML
      html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  onStatusUpdate("Finalizing...");
  return html;
};

/**
 * Generates an image using Gemini 3 Pro Image Preview model (Newest).
 */
export const generateCustomImage = async (prompt: string): Promise<string> => {
    if (!apiKey) return `https://placehold.co/800x600?text=${encodeURIComponent(prompt)}`;

    try {
        console.log("Generating image with Gemini 3 Pro for:", prompt);
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    { text: prompt }
                ]
            },
            config: {
                imageConfig: {
                    aspectRatio: "16:9", 
                    imageSize: "1K" // 1K is standard for web use
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        
        throw new Error("No image data found in response");

    } catch (e) {
        console.error("Gemini Image Generation Error:", e);
        // Fallback
        return `https://placehold.co/800x600?text=${encodeURIComponent("Image Gen Failed")}`;
    }
};