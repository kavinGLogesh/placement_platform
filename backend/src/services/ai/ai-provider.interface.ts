import {
  AiClassifyQuestionInput,
  AiClassifyResult,
} from '../../types/question.types.js';

export interface IAiClassificationProvider {
  readonly providerName: string;

  /**
   * Performs semantic and conceptual analysis on a question to classify category, topic,
   * difficulty, question type, confidence scores, and reasoning.
   */
  classifyQuestion(input: AiClassifyQuestionInput): Promise<AiClassifyResult>;
}
