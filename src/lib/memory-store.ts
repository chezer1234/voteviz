'use server';

// Define a more specific type for vote details
interface VoteDetails {
  voteName: string;
  candidates: { name: string }[];
  status: 'Open' | 'Closed' | 'Pending'; // Use specific status types
  maxVoters?: number; // Optional max voters
  creatorToken?: string; // Optional: Identifier for the user who created the vote
}

interface VoteData {
  details?: VoteDetails; // Use the specific type
  results?: Record<string, Record<string, number>>; // Example: { userId: { candidateName: points } }
}

// Enhance the globalThis type to include our store (TypeScript)
declare global {
  var voteStore: Record<string, VoteData> | undefined;
}

// Use globalThis in development to persist across HMR, otherwise use a local variable
const store = globalThis.voteStore || (globalThis.voteStore = {});

export async function saveVoteDetails(voteId: string, details: any, creatorToken?: string): Promise<void> {
  console.log(`[MemoryStore] saveVoteDetails called with voteId: ${voteId}, details:`, details, `creatorToken: ${creatorToken}`);
  if (!store[voteId]) {
    store[voteId] = {};
  }
  // Ensure candidates is always an array
  const candidatesArray = Array.isArray(details.candidates) ? details.candidates : [];

  store[voteId].details = {
    voteName: details.voteName,
    // Map candidate strings to objects if needed, handle existing objects
    candidates: candidatesArray.map((candidate: string | { name: string }) => 
        typeof candidate === 'string' ? { name: candidate } : candidate
    ),
    status: 'Open', // Default status
    maxVoters: details.maxVoters, // Store maxVoters if provided
    creatorToken: creatorToken, // Store the creator token
  };
  console.log(`[MemoryStore] Saved details for vote ${voteId}:`, store[voteId].details);
  console.log('[MemoryStore] Current store state:', store);
}

export async function getVoteDetails(voteId: string): Promise<VoteDetails | undefined> {
  const details = store[voteId]?.details;
  console.log(`[MemoryStore] Retrieved details for vote ${voteId}:`, details);
  // Return the whole details object
  return details;
}

export async function saveVoteResults(voteId: string, results: any): Promise<void> {
  if (!store[voteId]) {
    // Or handle error: Cannot save results for non-existent vote
    store[voteId] = {};
  }
  store[voteId].results = results;
  console.log(`[MemoryStore] Saved results for vote ${voteId}:`, results);
  console.log('[MemoryStore] Current store state:', store); // Add this line
}

export async function getVoteResults(voteId: string): Promise<any | undefined> {
  const results = store[voteId]?.results;
  console.log(`[MemoryStore] Retrieved results for vote ${voteId}:`, results);
  return results;
}

// Optional: Function to get all data for a vote
export async function getVoteData(voteId: string): Promise<VoteData | undefined> {
    const data = store[voteId];
    console.log(`[MemoryStore] Retrieved data for vote ${voteId}:`, data);
    return data;
}

// Optional: Log the store content for debugging (use carefully in production)
export async function logStore(): Promise<void> {
    console.log("[MemoryStore] Current store state:", store);
}

// Add a function to close the vote
export async function closeVote(voteId: string, providedToken: string): Promise<{ success: boolean; message: string }> {
    console.log(`[MemoryStore] Attempting to close vote ${voteId} with token ${providedToken}`);
    const vote = store[voteId];

    if (!vote || !vote.details) {
        console.log(`[MemoryStore] Vote ${voteId} not found.`);
        return { success: false, message: "Vote not found." };
    }

    if (vote.details.status === 'Closed') {
        console.log(`[MemoryStore] Vote ${voteId} is already closed.`);
        return { success: false, message: "Vote is already closed." };
    }

    // Check if the provided token matches the stored creator token
    if (!vote.details.creatorToken || vote.details.creatorToken !== providedToken) {
        console.log(`[MemoryStore] Unauthorized attempt to close vote ${voteId}. Provided token: ${providedToken}, Stored token: ${vote.details.creatorToken}`);
        return { success: false, message: "Unauthorized: Only the creator can close the vote." };
    }

    // Update the status to Closed
    vote.details.status = 'Closed';
    console.log(`[MemoryStore] Successfully closed vote ${voteId}. New status: ${vote.details.status}`);
    console.log('[MemoryStore] Current store state:', store);
    return { success: true, message: "Vote successfully closed." };
}



