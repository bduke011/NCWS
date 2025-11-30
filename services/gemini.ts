import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || ''; // Ensure this is set in your environment
const ai = new GoogleGenAI({ apiKey });

// --- AGENT PROMPTS ---

const PLANNING_PROMPT = `
You are the **Planning Agent**. Your goal is to interpret the user's request and create a structured plan for a single-page website.
Identify the sections needed (Hero, Features, Testimonials, Contact, etc.).
If the user references "Box X", identify which section they mean to modify.
Return a concise JSON object summarizing the requirements.
`;

const CODING_PROMPT = `
You are the **Code Agent**. You are an expert Tailwind CSS and HTML developer.
Your task is to generate the FULL HTML string for a single-page website based on the Plan provided.

**STRICT RULES:**
1. Use **Tailwind CSS** via CDN (assume <script src="https://cdn.tailwindcss.com"></script> is already loaded).
2. The design must be modern, responsive, and mobile-first.
3. **CRITICAL:** You must wrap every major element (Section, H1, H2, P, Button, Img, Div container) with a unique attribute: \`data-vibe-box="N"\` where N is a sequential number starting from 1.
   - Example: \`<h1 data-vibe-box="1" class="text-4xl...">Title</h1>\`
   - This is used for the "Edit by Box Number" feature.
4. Do not output Markdown code blocks (no \`\`\`html). Output raw HTML string only.
5. **IMAGES:** For every image needed, use a placeholder src (like "https://placehold.co/600x400") BUT you **MUST** add a \`data-image-prompt="..."\` attribute describing the image in detail.
   - Example: \`<img src="..." data-image-prompt="A high quality photo of a delicious texas bbq brisket, cinematic lighting" data-vibe-box="5" class="..." />\`
   - The Image Agent will use this prompt to generate a real image.
6. Ensure the layout is vertical scrolling.
7. Include smooth scrolling for anchor links.

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
        systemInstruction: PLANNING_PROMPT
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
      onStatusUpdate(`Image Agent: Generating ${imagesToGenerate.length} custom images with Gemini...`);
      
      // Generate images in parallel
      await Promise.all(imagesToGenerate.map(async (img) => {
          const prompt = img.getAttribute('data-image-prompt');
          if (prompt) {
              try {
                  const imageUrl = await generateCustomImage(prompt);
                  if (imageUrl) {
                      img.setAttribute('src', imageUrl);
                      // Remove the prompt attribute so we don't regenerate it next time unless changed
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
 * Generates an image using Gemini 2.5 Flash Image model.
 */
export const generateCustomImage = async (prompt: string): Promise<string> => {
    if (!apiKey) return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/800/600`;

    try {
        console.log("Generating image for:", prompt);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { text: prompt }
                ]
            },
            config: {
                imageConfig: {
                    aspectRatio: "16:9", // Versatile aspect ratio for web
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
        // Fallback if generation fails/quotas exceeded
        return `https://placehold.co/800x600?text=${encodeURIComponent(prompt.substring(0, 20))}`;
    }
};