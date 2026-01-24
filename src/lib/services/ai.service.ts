import type { FlashcardProposalDTO } from "../../types";
import { OpenRouterService } from "./openrouter.service";

/**
 * Interface for AI services that generate flashcard proposals.
 * This abstraction allows easy swapping between mock and real implementations.
 */
export interface AIService {
  /**
   * Returns the model name/identifier used by this service.
   * Used for database persistence and analytics.
   */
  get modelName(): string;

  generateFlashcardProposals(sourceText: string): Promise<FlashcardProposalDTO[]>;
}

/**
 * Mock implementation of AIService for MVP development.
 * Returns predefined flashcard proposals without calling external APIs.
 *
 * This will be replaced with OpenRouterService in production.
 */
export class MockAIService implements AIService {
  get modelName(): string {
    return "mock-ai";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateFlashcardProposals(_sourceText: string): Promise<FlashcardProposalDTO[]> {
    // Return predefined proposals for testing
    // In production, this would call OpenRouter API with the sourceText
    return [
      {
        front: "What is the main topic discussed in this text?",
        back: "The text discusses key concepts that are fundamental to understanding the subject matter presented.",
      },
      {
        front: "What are the primary benefits mentioned?",
        back: "The primary benefits include improved understanding, better retention, and practical application of knowledge.",
      },
      {
        front: "How does this concept relate to real-world applications?",
        back: "This concept can be applied in various real-world scenarios, enabling more effective problem-solving and decision-making.",
      },
      {
        front: "What are the key takeaways from this material?",
        back: "Key takeaways include understanding core principles, recognizing patterns, and applying learned concepts to new situations.",
      },
    ];
  }
}

/**
 * Factory function for creating AIService instances.
 * Automatically selects the appropriate implementation based on environment configuration.
 *
 * @returns AIService instance (either MockAIService or OpenRouterService)
 */
export function createAIService(): AIService {
  const useMock = import.meta.env.USE_MOCK_AI === "true";

  if (useMock) {
    console.log("[AI Service] Using MockAIService (USE_MOCK_AI=true)");
    return new MockAIService();
  }

  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn("[AI Service] OPENROUTER_API_KEY not found - falling back to MockAIService");
    return new MockAIService();
  }

  console.log("[AI Service] Using OpenRouterService");
  return new OpenRouterService({
    apiKey,
    baseUrl: import.meta.env.OPENROUTER_BASE_URL,
    modelName: "google/gemma-3-27b-it:free",
    timeout: 30000,
    maxRetries: 2,
    httpReferer: import.meta.env.PUBLIC_SITE_URL,
    appTitle: import.meta.env.PUBLIC_APP_NAME,
  });
}
