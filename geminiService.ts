
import { GoogleGenAI, Type } from "@google/genai";
import { Theme, Question, Difficulty } from "./types";

export const generateQuestions = async (theme: Theme, count: number = 10): Promise<Question[]> => {
  try {
    // Busca a chave de várias fontes possíveis para evitar erro 'process is not defined'
    const apiKey = (window as any).process?.env?.API_KEY || (globalThis as any).API_KEY;
    
    if (!apiKey) {
      console.warn("Gemini: API_KEY não configurada. O jogo usará perguntas locais.");
      return [];
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere ${count} perguntas reais sobre: ${theme}. 4 opções. JSON puro.`,
      config: {
        systemInstruction: "Você é um historiador de futebol. Retorne apenas JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["fácil", "médio", "difícil"] },
              subtheme: { type: Type.STRING }
            },
            required: ["text", "options", "correctAnswer", "difficulty", "subtheme"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    return JSON.parse(text).map((q: any) => ({
      ...q,
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      theme,
      approved: true
    }));
  } catch (error) {
    console.error("Erro Gemini:", error);
    return [];
  }
};
