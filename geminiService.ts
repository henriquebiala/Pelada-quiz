
import { GoogleGenAI, Type } from "@google/genai";
import { Theme, Question } from "./types";

// Acesso seguro para evitar erros em tempo de execução
const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : '';
const ai = new GoogleGenAI({ apiKey });

export const generateQuestions = async (theme: Theme, count: number = 8): Promise<Question[]> => {
  if (!apiKey) {
    console.warn("Gemini API Key não configurada. Usando perguntas locais.");
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere ${count} perguntas sobre ${theme}. Foque em curiosidades e fatos históricos marcantes.`,
      config: {
        systemInstruction: "Você é um historiador especialista em futebol mundial, africano e angolano. Gere perguntas reais, desafiadoras e curtas. Para o futebol angolano, mencione Girabola e ídolos como Akwá ou Mantorras. Para o africano, mencione a CAN. O formato deve ser JSON estrito.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "O enunciado da pergunta." },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "4 opções de resposta."
              },
              correctAnswer: { type: Type.STRING, description: "A opção correta exatamente como escrita no array de options." },
              subtheme: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["fácil", "médio", "difícil"] }
            },
            required: ["text", "options", "correctAnswer", "subtheme", "difficulty"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "[]");
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