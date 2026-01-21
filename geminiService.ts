import { GoogleGenAI, Type } from "@google/genai";
import { Theme, Question } from "./types";

// Always use the process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuestions = async (theme: Theme, count: number = 15): Promise<Question[]> => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key não configurada.");
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere exatamente ${count} perguntas sobre ${theme}. 
      A distribuição de dificuldade DEVE SER:
      - 5 perguntas de nível 'fácil'
      - 5 perguntas de nível 'médio'
      - 5 perguntas de nível 'difícil'
      
      Garanta que as perguntas sejam reais e históricas.`,
      config: {
        systemInstruction: "Você é um historiador especialista em futebol mundial, africano e angolano. Gere perguntas reais e desafiadoras. Para o futebol angolano, mencione Girabola e ídolos locais. Formato JSON estrito. Não repita perguntas.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.STRING },
              subtheme: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["fácil", "médio", "difícil"] }
            },
            required: ["text", "options", "correctAnswer", "subtheme", "difficulty"]
          }
        }
      }
    });

    // Directly access the .text property as per guidelines.
    const jsonStr = response.text || "[]";
    const parsed = JSON.parse(jsonStr);
    
    return parsed.map((q: any) => ({
      ...q,
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      theme,
      approved: true
    }));
  } catch (error) {
    console.error("Erro ao gerar perguntas via IA:", error);
    return [];
  }
};