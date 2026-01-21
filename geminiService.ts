
import { GoogleGenAI, Type } from "@google/genai";
import { Theme, Question, Difficulty } from "./types";

export const generateQuestions = async (theme: Theme, count: number = 10): Promise<Question[]> => {
  try {
    const apiKey = (process.env as any).API_KEY;
    
    if (!apiKey || apiKey === "undefined") {
      console.warn("Gemini: API_KEY não encontrada no process.env.");
      return [];
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere ${count} perguntas de múltipla escolha sobre: ${theme}. 
      Formato JSON com text, options (4), correctAnswer, difficulty (fácil, médio, difícil) e subtheme.`,
      config: {
        systemInstruction: "Você é um historiador de futebol. Retorne apenas JSON puro, sem markdown.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              subtheme: { type: Type.STRING }
            },
            required: ["text", "options", "correctAnswer", "difficulty", "subtheme"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const data = JSON.parse(text);
    return data.map((q: any) => ({
      ...q,
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      theme,
      approved: true
    }));
  } catch (error) {
    console.error("Erro no serviço Gemini:", error);
    return [];
  }
};
