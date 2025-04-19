'use server';
/**
 * @fileOverview This file defines a Genkit flow for checking the similarity between a new candidate and existing candidates.
 *
 * - candidateSimilarityCheck - A function that checks the similarity between a new and existing candidates.
 * - CandidateSimilarityCheckInput - The input type for the candidateSimilarityCheck function.
 * - CandidateSimilarityCheckOutput - The return type for the candidateSimilarityCheck function.
 */

import {ai} from '@/ai/ai-instance';
import {getCandidateSimilarity} from '@/services/candidate-similarity';
import {z} from 'genkit';

const CandidateSimilarityCheckInputSchema = z.object({
  newCandidate: z.string().describe('The name or description of the new candidate.'),
  existingCandidates: z
    .array(z.string())
    .describe('An array of names or descriptions of existing candidates.'),
});
export type CandidateSimilarityCheckInput = z.infer<
  typeof CandidateSimilarityCheckInputSchema
>;

const CandidateSimilarityCheckOutputSchema = z.object({
  isSimilar: z
    .boolean()
    .describe(
      'Whether the new candidate is similar to any of the existing candidates.'
    ),
  similarityScore: z
    .number()
    .describe(
      'The highest similarity score between the new candidate and existing candidates.'
    ),
});
export type CandidateSimilarityCheckOutput = z.infer<
  typeof CandidateSimilarityCheckOutputSchema
>;

export async function candidateSimilarityCheck(
  input: CandidateSimilarityCheckInput
): Promise<CandidateSimilarityCheckOutput> {
  return candidateSimilarityCheckFlow(input);
}

const candidateSimilarityCheckFlow =
  ai.defineFlow<
    typeof CandidateSimilarityCheckInputSchema,
    typeof CandidateSimilarityCheckOutputSchema
  >(
    {
      name: 'candidateSimilarityCheckFlow',
      inputSchema: CandidateSimilarityCheckInputSchema,
      outputSchema: CandidateSimilarityCheckOutputSchema,
    },
    async input => {
      let maxSimilarityScore = 0;

      for (const existingCandidate of input.existingCandidates) {
        const similarity = await getCandidateSimilarity(
          input.newCandidate,
          [existingCandidate]
        );
        maxSimilarityScore = Math.max(
          maxSimilarityScore,
          similarity.similarityScore
        );
      }

      const isSimilar = maxSimilarityScore > 0.7; // You can adjust the threshold as needed

      return {
        isSimilar: isSimilar,
        similarityScore: maxSimilarityScore,
      };
    }
  );
