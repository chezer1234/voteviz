import { NextRequest, NextResponse } from 'next/server';
import { saveVoteDetails, saveVoteResults } from '@/lib/memory-store';

// API route to generate test data
export async function GET(request: NextRequest) {
  try {
    // Create a new vote
    const voteId = `vote-test-${Date.now()}`;
    const creatorToken = 'test-creator';
    const voteDetails = {
      voteName: 'Test Vote',
      candidates: ['Option A', 'Option B', 'Option C'],
      status: 'Open'
    };
    
    await saveVoteDetails(voteId, voteDetails, creatorToken);
    
    // Submit votes from different users
    const user1 = 'test-user-1';
    const vote1 = {
      'Option A': 30,
      'Option B': 20,
      'Option C': 50
    };
    
    const user2 = 'test-user-2';
    const vote2 = {
      'Option A': 60,
      'Option B': 10,
      'Option C': 30
    };
    
    // Submit the votes
    await saveVoteResults(voteId, user1, vote1);
    await saveVoteResults(voteId, user2, vote2);
    
    return NextResponse.json({ 
      success: true, 
      voteId,
      message: 'Test vote created with 2 different user votes',
      voteUrl: `${request.nextUrl.origin}/vote/${voteId}/results`,
      users: [user1, user2],
      votes: [vote1, vote2]
    });
  } catch (error) {
    console.error('[API] Error creating test data:', error);
    return NextResponse.json(
      { error: 'Failed to create test data' },
      { status: 500 }
    );
  }
} 