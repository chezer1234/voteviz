'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Mock data structure (replace with actual data fetching)
interface VoteDetails {
  voteName: string;
  candidates: { name: string }[]; // Just names for voting page initially
  status: 'Open' | 'Closed' | 'Pending'; // Added 'Pending' for before vote starts
  // Add other details if needed, like description or end date
}

interface CandidatePoints {
  [candidateName: string]: number;
}

// Mock data fetching function
const fetchVoteDetails = async (voteId: string): Promise<VoteDetails | null> => {
  console.log(`Fetching details for vote: ${voteId}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

  // In a real app, fetch from your backend API
  if (voteId === "mock-vote-123") { // Example ID
    return {
      voteName: "Favorite Color Vote",
      candidates: [
        { name: 'Red' },
        { name: 'Blue' },
        { name: 'Green' },
      ],
      status: 'Open', // Can be 'Pending', 'Open', 'Closed'
    };
  }
  return null; // Vote not found
};

// In-memory store for vote data (replace with actual backend)
let voteResults: { [voteId: string]: { [candidateName: string]: number } } = {};

// Mock function to submit vote
const submitVote = async (voteId: string, points: CandidatePoints): Promise<boolean> => {
  console.log(`Submitting vote for ${voteId}:`, points);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay

  // Simulate saving to backend (replace with API call)
  voteResults[voteId] = points;

  return true;
};

// Mock function to propose a candidate
const proposeCandidate = async (voteId: string, candidateName: string): Promise<boolean> => {
  console.log(`Proposing candidate "${candidateName}" for vote ${voteId}`);
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
  // In a real app, send to backend (incl. AI check), handle success/failure
  // For simulation, we just resolve true (assuming it passes checks)
  return true;
}

const VOTE_STORAGE_KEY_PREFIX = 'vote_casted_';

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const voteId = params.voteId as string;

  const [voteDetails, setVoteDetails] = useState<VoteDetails | null>(null);
  const [candidatePoints, setCandidatePoints] = useState<CandidatePoints>({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [proposing, setProposing] = useState(false);

  const voteStorageKey = `${VOTE_STORAGE_KEY_PREFIX}${voteId}`;

  // Fetch vote details and check if user has already voted
  useEffect(() => {
    if (voteId) {
      fetchVoteDetails(voteId)
        .then(data => {
          if (data) {
            setVoteDetails(data);
            // Initialize points state
            const initialPoints: CandidatePoints = {};
            data.candidates.forEach(c => initialPoints[c.name] = 0);
            setCandidatePoints(initialPoints);
          } else {
            setError('Vote not found.');
          }
        })
        .catch(err => {
          console.error("Error fetching vote details:", err);
          setError('Failed to load vote details.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [voteId]);

  // Update total points whenever individual points change
  useEffect(() => {
    const sum = Object.values(candidatePoints).reduce((acc, points) => acc + points, 0);
    setTotalPoints(sum);
  }, [candidatePoints]);

  const handleSliderChange = (candidateName: string, value: number[]) => {
    const newPoints = value[0];
    const currentPoints = candidatePoints[candidateName];
    const diff = newPoints - currentPoints;
    const newTotal = totalPoints + diff;

    if (newTotal <= 100) {
      setCandidatePoints(prev => ({ ...prev, [candidateName]: newPoints }));
    } else {
      // If trying to exceed 100, don't update this slider
      // Optionally provide feedback to the user
      toast({ title: "Cannot exceed 100 total points", variant: "destructive" });
    }
  };

  const handleVoteSubmit = async () => {
    if (totalPoints !== 100) {
      toast({ title: "Total points must be exactly 100", variant: "destructive" });
      return;
    }
    if (!voteDetails || voteDetails.status !== 'Open') {
       toast({ title: "Voting is not currently open", variant: "destructive" });
       return;
    }

    setSubmitting(true);
    try {
      const success = await submitVote(voteId, candidatePoints);
      if (success) {
        toast({ title: "Vote Submitted Successfully!" });
        router.push(`/vote/${voteId}/results`); // Redirect to results
      } else {
        toast({ title: "Vote Submission Failed", description: "Could not record your vote. Please try again.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Error submitting vote:", err);
      toast({ title: "Vote Submission Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

   const handleProposeCandidate = async () => {
    if (!newCandidateName.trim()) {
      toast({ title: "Candidate name cannot be empty", variant: "destructive" });
      return;
    }
    // Basic check if candidate already exists (case-insensitive)
    if (voteDetails?.candidates.some(c => c.name.toLowerCase() === newCandidateName.trim().toLowerCase())) {
      toast({ title: "Candidate already exists", variant: "destructive" });
      return;
    }
    // Check if voting is pending (as per blueprint)
     if (voteDetails?.status !== 'Pending') {
      toast({ title: "Candidates can only be proposed before voting opens", variant: "destructive" });
      return;
    }

    setProposing(true);
    try {
      // Here, the real app would call the backend, which includes the AI check.
      const success = await proposeCandidate(voteId, newCandidateName.trim());
      if (success) {
        toast({ title: "Candidate Proposed Successfully!", description: "(Simulated - AI check would run on backend)" });
        // // OPTIONAL: Add candidate to list locally for immediate feedback (if backend doesn't push updates)
        // setVoteDetails(prev => prev ? {
        //   ...prev,
        //   candidates: [...prev.candidates, { name: newCandidateName.trim() }]
        // } : null);
        // setCandidatePoints(prev => ({ ...prev, [newCandidateName.trim()]: 0 }));
        setNewCandidateName(""); // Clear input
        // Note: A real implementation might require re-fetching vote details or rely on backend push
      } else {
        toast({ title: "Failed to Propose Candidate", description: "Could not add the candidate. (Simulated failure or AI rejection)", variant: "destructive" });
      }
    } catch (err) {
      console.error("Error proposing candidate:", err);
      toast({ title: "Proposal Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setProposing(false);
    }
  };


  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading vote...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!voteDetails) {
    return <div className="container mx-auto p-4 text-center">Vote not found.</div>;
  }

  const canPropose = voteDetails.status === 'Pending';
  const canVote = voteDetails.status === 'Open';

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Cast Your Vote: {voteDetails.voteName}</CardTitle>
          <CardDescription>Distribute 100 points among the candidates. Vote ID: {voteId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {voteDetails.candidates.map((candidate) => (
            <div key={candidate.name} className="space-y-2">
              <Label className="flex justify-between">
                <span>{candidate.name}</span>
                <span className="font-semibold">{candidatePoints[candidate.name] ?? 0} points</span>
              </Label>
              <Slider
                value={[candidatePoints[candidate.name] ?? 0]}
                onValueChange={(value) => handleSliderChange(candidate.name, value)}
                max={100}
                step={1}
                disabled={!canVote || submitting}
              />
            </div>
          ))}
          <div className="text-right font-semibold mt-4">
            Total Points Allocated: {totalPoints} / 100
          </div>
          <Button
            onClick={handleVoteSubmit}
            disabled={totalPoints !== 100 || !canVote || submitting}
            className="w-full mt-4"
          >
            {submitting ? 'Submitting...' : 'Place Vote'}
          </Button>
            {!canVote && voteDetails.status !== 'Closed' && (
               <p className='text-center text-muted-foreground mt-2'>Voting is not open yet.</p>
            )}
             {voteDetails.status === 'Closed' && (
               <p className='text-center text-destructive mt-2'>Voting has closed.</p>
            )}
        </CardContent>
      </Card>

      {/* Candidate Proposal Section - Visible only before voting opens (Pending state) */}
      {canPropose && (
          <Card>
              <CardHeader>
                  <CardTitle>Propose a New Candidate</CardTitle>
                  <CardDescription>Add another option before voting begins. (Requires AI similarity check on backend)</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                  <Input
                      placeholder="Enter new candidate name"
                      value={newCandidateName}
                      onChange={(e) => setNewCandidateName(e.target.value)}
                      disabled={proposing}
                  />
                  <Button onClick={handleProposeCandidate} disabled={proposing || !newCandidateName.trim()}>
                      {proposing ? 'Proposing...' : 'Propose'}
                  </Button>
              </CardContent>
          </Card>
      )}
    </div>
  );
}
