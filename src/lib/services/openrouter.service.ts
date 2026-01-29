import type { OpenRouterConfig, OpenRouterRequest, OpenRouterResponse, FlashcardProposalDTO } from '@/types.ts';
import type { AIService } from './ai.service';
import { openRouterResponseSchema, flashcardsResponseSchema } from '../schemas/openrouter.schema';
import {
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  InvalidRequestError,
  ServerError,
  TimeoutError,
  NetworkError,
  InvalidResponseError,
} from '../errors/openrouter.errors';

/**
 * Maximum wait time for rate limit retries (10 seconds).
 * Prevents indefinite blocking when OpenRouter returns very long Retry-After values.
 */
const MAX_RETRY_WAIT = 10000;

/**
 * Production implementation of AIService using OpenRouter API.
 * Generates flashcard proposals by sending structured prompts to LLM models.
 *
 * Features:
 * - Structured JSON output via response_format
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 * - Runtime validation with Zod schemas
 */
export class OpenRouterService implements AIService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly _modelName: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly httpReferer?: string;
  private readonly appTitle?: string;

  constructor(config: OpenRouterConfig) {
    // Validate required configuration
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('OpenRouter API key is required');
    }

    // Initialize configuration with defaults
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this._modelName = config.modelName || 'google/gemma-3-27b-it:free';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 2;
    this.httpReferer = config.httpReferer;
    this.appTitle = config.appTitle || '10x-cards';
  }

  /**
   * Returns the model name used by this service.
   * Required by AIService interface.
   */
  get modelName(): string {
    return this._modelName;
  }

  /**
   * Generates flashcard proposals from source text.
   * Main entry point implementing AIService interface.
   */
  async generateFlashcardProposals(sourceText: string): Promise<FlashcardProposalDTO[]> {
    console.log(`[OpenRouter] Request started - Model: ${this._modelName}, TextLength: ${sourceText.length}`);

    const payload = this.buildRequestPayload(sourceText);
    const response = await this.executeRequest(payload);
    const flashcards = this.parseAndValidateResponse(response);

    console.log(`[OpenRouter] Response received - Flashcards: ${flashcards.length}`);

    return flashcards;
  }

  /**
   * Constructs the OpenRouter API request payload.
   */
  private buildRequestPayload(sourceText: string): OpenRouterRequest {
    return {
      model: this._modelName,
      messages: [
        {
          role: 'system',
          content: `You are an expert educational content creator specializing in creating high-quality flashcards for spaced repetition learning. Your goal is to extract key concepts from the provided text and transform them into clear, concise question-answer pairs that facilitate effective learning.

Guidelines:
- Focus each flashcard on a single concept or fact
- Write clear, specific questions that aren't ambiguous
- Provide complete, accurate answers
- Avoid simple yes/no questions when possible
- Cover different cognitive levels: definitions, applications, relationships, examples
- Ensure questions are self-contained (don't reference "the text" or "above")
- Generate between 4 and 8 flashcards based on content richness`,
        },
        {
          role: 'user',
          content: `Based on the following text, generate flashcards following the guidelines provided.

Text:
${sourceText}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'flashcard_proposals',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              flashcards: {
                type: 'array',
                description: 'Array of generated flashcard proposals',
                items: {
                  type: 'object',
                  properties: {
                    front: {
                      type: 'string',
                      description: 'The question or prompt for the flashcard',
                    },
                    back: {
                      type: 'string',
                      description: 'The answer or explanation for the flashcard',
                    },
                  },
                  required: ['front', 'back'],
                  additionalProperties: false,
                },
                minItems: 4,
                maxItems: 8,
              },
            },
            required: ['flashcards'],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.4,
      max_tokens: 2000,
      top_p: 1.0,
    };
  }

  /**
   * Executes HTTP request with timeout and retry logic.
   */
  private async executeRequest(payload: OpenRouterRequest, retryCount = 0): Promise<OpenRouterResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.httpReferer || '',
          'X-Title': this.appTitle || '10x-cards',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle different HTTP status codes
      if (response.ok) {
        const data = await response.json();
        return data as OpenRouterResponse;
      }

      // Handle error responses with retry logic
      const shouldRetry = retryCount < this.maxRetries && (response.status === 429 || response.status >= 500);

      if (shouldRetry) {
        // Parse Retry-After header if present
        const retryAfterHeader = response.headers.get('Retry-After');
        let waitTime = Math.pow(2, retryCount) * 1000; // Default exponential backoff

        if (retryAfterHeader) {
          const retryAfterSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(retryAfterSeconds)) {
            waitTime = retryAfterSeconds * 1000;
          }
        }

        // Cap wait time to prevent indefinite blocking
        if (waitTime > MAX_RETRY_WAIT) {
          throw new RateLimitError(
            `Rate limit exceeded. Retry after ${Math.ceil(waitTime / 1000)}s exceeds maximum wait time.`,
            Math.ceil(waitTime / 1000),
          );
        }

        console.warn(`[OpenRouter] Retry attempt ${retryCount + 1}/${this.maxRetries} after ${waitTime}ms`);
        await this.wait(waitTime);
        return this.executeRequest(payload, retryCount + 1);
      }

      // Map HTTP status codes to specific errors
      switch (response.status) {
        case 401:
          throw new AuthenticationError('Invalid or missing API key');
        case 403:
          throw new AuthorizationError('Insufficient permissions');
        case 429: {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
          throw new RateLimitError('Rate limit exceeded', retryAfter);
        }
        case 400:
        case 422:
          throw new InvalidRequestError(`Invalid request: ${response.statusText}`);
        default:
          if (response.status >= 500) {
            throw new ServerError(`Server error: ${response.statusText}`, response.status);
          }
          throw new NetworkError(`HTTP error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        // Distinguish timeout from other network errors
        if (error.name === 'AbortError') {
          throw new TimeoutError('Request timeout exceeded');
        }

        // Re-throw our custom errors
        if (
          error.name.includes('Error') &&
          (error instanceof AuthenticationError ||
            error instanceof AuthorizationError ||
            error instanceof RateLimitError ||
            error instanceof InvalidRequestError ||
            error instanceof ServerError ||
            error instanceof TimeoutError ||
            error instanceof NetworkError)
        ) {
          throw error;
        }

        throw new NetworkError(`Network error: ${error.message}`);
      }

      throw new NetworkError('Unknown network error');
    }
  }

  /**
   * Validates API response and transforms to FlashcardProposalDTO[].
   */
  private parseAndValidateResponse(apiResponse: OpenRouterResponse): FlashcardProposalDTO[] {
    try {
      // Validate overall OpenRouter response structure
      const validatedResponse = openRouterResponseSchema.parse(apiResponse);

      // Extract content from first choice
      const content = validatedResponse.choices[0].message.content;

      // Parse content as JSON
      let parsedContent: unknown;
      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        throw new InvalidResponseError(
          `Failed to parse response content as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Validate parsed content against flashcards schema
      const validatedFlashcards = flashcardsResponseSchema.parse(parsedContent);

      return validatedFlashcards.flashcards;
    } catch (error) {
      if (error instanceof InvalidResponseError) {
        throw error;
      }

      // Handle Zod validation errors
      const errorMessage =
        error instanceof Error ? `Invalid response format: ${error.message}` : 'Invalid response format';

      throw new InvalidResponseError(errorMessage);
    }
  }

  /**
   * Helper for implementing exponential backoff.
   */
  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
