import { IAiClassificationProvider } from './ai-provider.interface.js';
import { geminiAiClassificationProvider } from './gemini-classification.provider.js';
import { semanticClassifierProvider } from './semantic-classifier.provider.js';
import {
  AiClassifyQuestionInput,
  AiClassifyResult,
  BatchClassifyResult,
  AiClassificationStatus,
} from '../../types/question.types.js';
import { logger } from '../../utils/logger.util.js';

export class AiClassificationService {
  private primaryProvider: IAiClassificationProvider;
  private fallbackProvider: IAiClassificationProvider;

  constructor(
    primary: IAiClassificationProvider = geminiAiClassificationProvider,
    fallback: IAiClassificationProvider = semanticClassifierProvider
  ) {
    this.primaryProvider = primary;
    this.fallbackProvider = fallback;
  }

  /**
   * Intelligently classifies a question.
   * Server-side only, non-blocking, multi-stage fallback.
   */
  async classify(input: AiClassifyQuestionInput): Promise<AiClassifyResult> {
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());

    if (hasGeminiKey) {
      try {
        const result = await this.primaryProvider.classifyQuestion(input);
        return result;
      } catch (err: any) {
        logger.warn(
          `[AiClassificationService] Primary provider '${this.primaryProvider.providerName}' failed: ${err.message}. Falling back to '${this.fallbackProvider.providerName}'.`
        );
      }
    }

    try {
      const fallbackResult = await this.fallbackProvider.classifyQuestion(input);
      return fallbackResult;
    } catch (fallbackErr: any) {
      logger.error(
        `[AiClassificationService] Fallback provider '${this.fallbackProvider.providerName}' failed: ${fallbackErr.message}`
      );

      // Return a safe failure object so the caller and DB never crash
      return {
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
        confidence: {
          category: 0.0,
          topic: 0.0,
          difficulty: 0.0,
          questionType: 0.0,
          overall: 0.0,
        },
        reasoning: `AI classification failed: ${fallbackErr.message}`,
        status: 'AI_FAILED',
        modelName: 'None',
      };
    }
  }

  /**
   * Batch classifies multiple questions with concurrency control
   */
  async batchClassify(
    inputs: Array<{ questionId: string; input: AiClassifyQuestionInput }>,
    concurrency = 5
  ): Promise<BatchClassifyResult> {
    const results: BatchClassifyResult['results'] = [];
    let classified = 0;
    let needsReview = 0;
    let failed = 0;

    for (let i = 0; i < inputs.length; i += concurrency) {
      const chunk = inputs.slice(i, i + concurrency);
      const chunkPromises = chunk.map(async ({ questionId, input }) => {
        try {
          const res = await this.classify(input);
          if (res.status === 'CLASSIFIED') classified++;
          else if (res.status === 'NEEDS_REVIEW') needsReview++;
          else failed++;

          return {
            questionId,
            status: res.status,
            classification: res,
          };
        } catch (err: any) {
          failed++;
          return {
            questionId,
            status: 'AI_FAILED' as AiClassificationStatus,
            error: err.message,
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return {
      totalRequested: inputs.length,
      processed: results.length,
      classified,
      needsReview,
      failed,
      results,
    };
  }
}

export const aiClassificationService = new AiClassificationService();
