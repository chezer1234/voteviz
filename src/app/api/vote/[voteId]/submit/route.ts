import { NextRequest, NextResponse } from 'next/server';
import { saveVoteResults } from '@/lib/memory-store';

// API route to submit a vote
export async function POST(
  request: NextRequest,
  { params }: { params: { voteId: string } }
) {
  const voteId = params.voteId;
  
  try {
    const body = await request.json();
    const { userId, userVote } = body;
    
    if (!userId || !userVote) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and userVote' },
        { status: 400 }
      );
    }
    
    // Use the memory store to save the vote
    await saveVoteResults(voteId, userId, userVote);
    
    console.log(`[API] Submitted vote for ${voteId} from user ${userId}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API] Error submitting vote for ${voteId}:`, error);
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    );
  }
} 