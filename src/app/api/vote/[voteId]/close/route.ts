import { NextResponse } from 'next/server';
import { closeVote } from '@/lib/memory-store';

export async function POST(
  request: Request,
  { params }: { params: { voteId: string } }
) {
  const voteId = params.voteId;

  if (!voteId) {
    return NextResponse.json({ message: 'Vote ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { creatorToken } = body;

    if (!creatorToken) {
        return NextResponse.json({ message: 'Creator token is required for authorization' }, { status: 400 });
    }

    console.log(`[API Close Route] Received request to close vote ${voteId} with token ${creatorToken}`);

    // Call the closeVote function from the memory store
    const result = await closeVote(voteId, creatorToken);

    if (result.success) {
        console.log(`[API Close Route] Vote ${voteId} closed successfully.`);
        return NextResponse.json({ message: result.message }, { status: 200 });
    } else {
        console.log(`[API Close Route] Failed to close vote ${voteId}: ${result.message}`);
        // Determine appropriate status code based on failure reason
        const statusCode = result.message.includes('Unauthorized') ? 403 : 
                           result.message.includes('not found') ? 404 :
                           result.message.includes('already closed') ? 409 : // Conflict
                           400; // Bad Request for other errors
        return NextResponse.json({ message: result.message }, { status: statusCode });
    }
  } catch (error: any) {
    console.error(`[API Close Route] Error processing close request for vote ${voteId}:`, error);
    // Handle potential JSON parsing errors or other unexpected issues
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 