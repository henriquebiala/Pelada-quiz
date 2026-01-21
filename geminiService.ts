
import { GoogleGenAI, Type } from "@google/genai";
import { Theme, Difficulty, Question } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuestions = async (theme: Theme, count: number = 5): Promise<Question[]> => {
  // Otimização do prompt para velocidade máxima
  const prompt = `Gere ${count} perguntas CURTAS e REAIS de futebol sobre "${theme}". 
  Foque em fatos históricos e curiosidades. 
  Angola: Girabola e Palancas. 
  África: CAN e CAF. 
  Mundial: Copas e Lendas.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              subtheme: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["fácil", "médio", "difícil"] }
            },
            required: ["text", "options", "correctAnswer", "subtheme", "difficulty"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text);
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
