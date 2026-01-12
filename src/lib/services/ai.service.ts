import type { FlashcardProposalDTO } from "../../types";

/**
 * Interface for AI services that generate flashcard proposals.
 * This abstraction allows easy swapping between mock and real implementations.
 */
export interface AIService {
  generateFlashcardProposals(sourceText: string): Promise<FlashcardProposalDTO[]>;
}

/**
 * Mock implementation of AIService for MVP development.
 * Returns predefined flashcard proposals without calling external APIs.
 *
 * This will be replaced with OpenRouterService in production.
 */
export class MockAIService implements AIService {
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
