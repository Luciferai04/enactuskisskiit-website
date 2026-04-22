
import { GoogleGenAI, Type } from "@google/genai";
import { Project, Task, User, NexusInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PROMPT_CLEAN_PROSE_INSTR = "IMPORTANT: Do NOT use any markdown formatting like hashtags (#), bolding with stars (**), or bullet point characters (- or *). Use only clean, professional, human-readable prose with standard punctuation and capitalization. Explicitly state that this is an AI ADVISORY draft and requires human verification.";

/**
 * ORCHESTRATOR: Coordinates specialized agents for Enactus Nexus.
 */
export async function nexusOrchestrator(
  action: 'ANALYZE_TASK' | 'GET_HEALTH' | 'CHECK_WORKLOAD' | 'RESEARCH_IDEAS' | 'MEMBER_SUPPORT' | 'PITCH_SCRIPT' | 'MAP_INSIGHTS' | 'DAILY_SUMMARY' | 'HANDOVER_PACK' | 'SUMMARIZE_TASK' | 'GET_TASK_DNA',
  data: any
): Promise<any> {
  switch(action) {
    case 'ANALYZE_TASK':
      return [await analyzeTaskClarity(data as Task)];
    case 'RESEARCH_IDEAS':
      return await researchProjectIdeas(data.query, data.location);
    case 'MEMBER_SUPPORT':
      return [await getMemberExecutionSupport(data.task)];
    case 'PITCH_SCRIPT':
      return await generatePitchScript(data.project, data.tasks);
    case 'MAP_INSIGHTS':
      return await getMapInsights(data.project);
    case 'DAILY_SUMMARY':
      return await generateDailySummary(data.input, data.tasks);
    case 'HANDOVER_PACK':
      return await generateHandoverPack(data.project, data.tasks);
    case 'SUMMARIZE_TASK':
      return await summarizeTask(data as Task);
    case 'GET_TASK_DNA':
      return await getTaskDNA(data as Task);
    default:
      return [];
  }
}

/**
 * GET_TASK_DNA: Synthesizes structured insights for a task, including sentiment and skill mapping.
 */
async function getTaskDNA(task: Task): Promise<any> {
  const model = 'gemini-3-flash-preview';
  const progressLogs = task.progressEntries.map(e => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.text}`).join('; ');
  
  const prompt = `
    Act as a Mission Intelligence Officer. Analyze this operative mission:
    Task: "${task.title}"
    History: ${progressLogs || "No logs available."}
    
    Required:
    1. A sharp 2-sentence summary of mission status.
    2. Sentiment analysis (Strictly: Focused, Challenged, or Stalled).
    3. Identify 3 specific entrepreneurial skills being utilized (e.g., Resource Optimization, Stakeholder Mapping).
    
    Return JSON.
  `;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            sentiment: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "sentiment", "skills"]
        }
      }
    });
    return JSON.parse(result.text || "{}");
  } catch (e) {
    return { summary: "Mission telemetry currently offline.", sentiment: "Unknown", skills: [] };
  }
}

/**
 * ANALYZE_TASK_CLARITY: Audits task directives against SMART criteria and provides actionable refinements.
 */
async function analyzeTaskClarity(task: Task): Promise<NexusInsight> {
  const model = 'gemini-3-flash-preview';
  const prompt = `
    Act as a Senior Operations Auditor for Enactus Global. Your mission is to rigorously audit the following task directive for SMART alignment (Specific, Measurable, Achievable, Relevant, Time-bound).
    
    Mission Title: "${task.title}"
    Mission Directive (Description): "${task.description}"
    Deadline Horizon: "${task.deadline}"
    
    Your Audit Objectives:
    1. Clarity Index (0-100): How precise is this mission for a junior operative?
    2. SMART Forensic Analysis: Provide a brief "Why" or "Missing Element" for each component (S, M, A, R, T).
    3. Operational Interrogations: 3-5 sharp questions the Chapter Admin must ask the operative to remove all mission fog. 
    4. Mission Directive Patch: A professionally rewritten, high-fidelity description that satisfies all SMART requirements and provides clear success metrics.

    ${PROMPT_CLEAN_PROSE_INSTR}
  `;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clarityScore: { type: Type.INTEGER },
            smartScorecard: {
              type: Type.OBJECT,
              properties: {
                specific: { type: Type.STRING, description: "Precision of the outcome." },
                measurable: { type: Type.STRING, description: "Clarity of success metrics." },
                achievable: { type: Type.STRING, description: "Feasibility within constraints." },
                relevant: { type: Type.STRING, description: "Strategic alignment." },
                timeBound: { type: Type.STRING, description: "Deadline clarity." }
              },
              required: ["specific", "measurable", "achievable", "relevant", "timeBound"]
            },
            refinementInterrogations: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedPatch: { type: Type.STRING }
          },
          required: ["clarityScore", "smartScorecard", "refinementInterrogations", "suggestedPatch"]
        }
      }
    });

    const parsed = JSON.parse(result.text || "{}");
    
    return {
      type: 'CLARITY',
      agentName: 'Nexus SMART Auditor',
      message: `Clarity Rating: ${parsed.clarityScore}/100.`,
      actionable: parsed.suggestedPatch,
      score: parsed.clarityScore,
      details: {
        smart: parsed.smartScorecard,
        questions: parsed.refinementInterrogations,
        suggestion: parsed.suggestedPatch
      }
    };
  } catch (e) {
    return { 
      type: 'CLARITY', 
      agentName: 'Nexus Auditor', 
      message: "SMART Telemetry Offline.", 
      actionable: "Audit manually." 
    };
  }
}

async function summarizeTask(task: Task): Promise<string> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Summarize mission impact for: ${task.title}. ${PROMPT_CLEAN_PROSE_INSTR}`;
  try {
    const res = await ai.models.generateContent({ model, contents: prompt });
    return res.text || "Summary unavailable.";
  } catch (e) { return "Error generating summary."; }
}

async function generateHandoverPack(project: Project, tasks: Task[]): Promise<string> {
  // Switched to Gemini 3 Flash to remain strictly in the highest-limit free tier
  const model = 'gemini-3-flash-preview';
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').map(t => t.title).join(', ');
  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED').map(t => t.title).join(', ');
  const reflections = project.reflections?.map(r => r.text).join('; ') || "None provided.";

  const prompt = `
    Act as a Chief Operations Officer for Enactus Global. You are creating a "Legacy Handover Dossier" for a project successor.
    
    Project: ${project.name}
    Mission Objective: ${project.description}
    Captured Victories (Completed): ${completedTasks || "None yet."}
    Active Sorties (Pending): ${pendingTasks || "All finished."}
    Tactical Reflections: ${reflections}
    
    The Dossier must include:
    1. Executive Perspective: A high-level view of the project's impact journey so far.
    2. Critical Knowledge Transfer: Key insights, stakeholder nuances, and 'unwritten rules' discovered during execution.
    3. Strategic Momentum: How the successor can maintain velocity and what they should prioritize in their first 30 days.
    4. Threat Assessment: Risks identified that remain active.
    
    ${PROMPT_CLEAN_PROSE_INSTR}
  `;
  
  try {
    const res = await ai.models.generateContent({ 
      model, 
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    return res.text || "Handover synthesis failed.";
  } catch (e) {
    console.error(e);
    return "The Nexus Handover Bureau is currently overloaded. Please try again later.";
  }
}

export async function generateDailySummary(input: string, tasks: any[]): Promise<any> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Analyze daily impact log: "${input}". Return JSON.`;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            taskId: { type: Type.STRING },
            logEntry: { type: Type.STRING },
            progressDelta: { type: Type.INTEGER },
            interpretation: { type: Type.STRING },
            skillsIdentified: { type: Type.ARRAY, items: { type: Type.STRING } },
            sentiment: { type: Type.STRING }
          },
          required: ["taskId", "logEntry", "progressDelta", "interpretation", "skillsIdentified", "sentiment"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) { return null; }
}

async function researchProjectIdeas(query: string, location: string): Promise<any> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Research social innovation for: ${query} in ${location}. ${PROMPT_CLEAN_PROSE_INSTR}`;
  try {
    const response = await ai.models.generateContent({ model, contents: prompt, config: { tools: [{ googleSearch: {} }] } });
    return { text: response.text, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
  } catch (e) { return { text: "Search failed.", sources: [] }; }
}

async function getMapInsights(project: Project): Promise<any> {
  const model = 'gemini-2.5-flash';
  const prompt = `Analyze ecosystem at ${project.location?.address}. ${PROMPT_CLEAN_PROSE_INSTR}`;
  try {
    const response = await ai.models.generateContent({ model, contents: prompt, config: { tools: [{ googleMaps: {} }] } });
    return { text: response.text, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
  } catch (e) { return { text: "Map failed.", sources: [] }; }
}

async function generatePitchScript(project: Project, tasks: Task[]): Promise<string> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Generate a 1-minute Enactus competition pitch for ${project.name}. ${PROMPT_CLEAN_PROSE_INSTR}`;
  const res = await ai.models.generateContent({ model, contents: prompt });
  return res.text || "Pitch failed.";
}

export async function generateImpactResume(user: User, tasks: Task[]): Promise<string> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Generate Enactus impact resume for ${user.name}. ${PROMPT_CLEAN_PROSE_INSTR}`;
  const res = await ai.models.generateContent({ model, contents: prompt });
  return res.text || "Resume failed.";
}

async function getMemberExecutionSupport(task: Task): Promise<NexusInsight> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Support mission for ${task.title}. ${PROMPT_CLEAN_PROSE_INSTR}`;
  try {
    const result = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { mission: { type: Type.STRING }, impact: { type: Type.STRING } } } } });
    const parsed = JSON.parse(result.text || "{}");
    return { type: 'PROGRESS', agentName: 'Support', message: parsed.mission, actionable: parsed.impact };
  } catch (e) { return { type: 'PROGRESS', agentName: 'Support', message: "Keep pushing!" }; }
}

export async function generateWeeklyReport(project: Project, tasks: Task[], users: User[]): Promise<any> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Generate a project audit report for ${project.name}. Return JSON.`;
  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            accomplishments: { type: Type.ARRAY, items: { type: Type.STRING } },
            risks: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  description: { type: Type.STRING }, 
                  severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] } 
                } 
              } 
            },
            nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            overallStatus: { type: Type.STRING, enum: ['ON_TRACK', 'AT_RISK', 'CRITICAL'] }
          },
          required: ["executiveSummary", "accomplishments", "risks", "nextSteps", "overallStatus"]
        }
      }
    });
    return JSON.parse(result.text || "{}");
  } catch (e) { return null; }
}

export async function getPerformanceInsights(tasks: Task[]): Promise<string[]> {
  const model = 'gemini-3-flash-preview';
  try {
    const result = await ai.models.generateContent({ model, contents: `Generate 3 insights. ${PROMPT_CLEAN_PROSE_INSTR}`, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } } });
    return JSON.parse(result.text || "[]");
  } catch (e) { return ["Analyze your impact flow."]; }
}

export async function generateCreativeAsset(prompt: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ text: prompt }] } });
    for (const part of response.candidates[0].content.parts) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
    return null;
  } catch (e) { return null; }
}
