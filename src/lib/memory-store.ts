interface VoteData {
  details?: any; // Replace 'any' with your actual vote details type/interface if available
  results?: any; // Replace 'any' with your actual vote results type/interface if available
}

// This object will hold all vote data in memory
const store: Record<string, VoteData> = {};

export async function saveVoteDetails(voteId: string, details: any): Promise<void> {
  if (!store[voteId]) {
    store[voteId] = {};
  }
  store[voteId].details = details;
  console.log(`[MemoryStore] Saved details for vote ${voteId}:`, details);
}

export async function getVoteDetails(voteId: string): Promise<any | undefined> {
  const details = store[voteId]?.details;
  console.log(`[MemoryStore] Retrieved details for vote ${voteId}:`, details);
  return details;
}

export async function saveVoteResults(voteId: string, results: any): Promise<void> {
  if (!store[voteId]) {
    // Or handle error: Cannot save results for non-existent vote
    store[voteId] = {}; 
  }
  store[voteId].results = results;
  console.log(`[MemoryStore] Saved results for vote ${voteId}:`, results);
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
export function logStore(): void {
    console.log("[MemoryStore] Current store state:", store);
}
