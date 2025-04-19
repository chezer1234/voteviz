'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getVoteDetails, saveVoteResults, getVoteResults } from '@/lib/memory-store';
import { ArrowRightIcon, BanIcon, CheckCircle2Icon, InfoIcon, Loader2Icon } from 'lucide-react'; // Import more icons
import { cn } from "@/lib/utils"; // Import cn utility
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import { Progress } from "@/components/ui/progress"; // Import Progress


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

// In-memory store for vote data (replace with actual backend)
// let voteResults: { [voteId: string]: { [candidateName: string]: number } } = {};

// Mock function to submit vote
const submitVote = async (voteId: string, points: CandidatePoints): Promise<void> => {
    console.log(`Submitting vote for ${voteId}:`, points);
    await new Promise(resolve => setTimeout(resolve, 700));
    const userVoteKey = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`; // More robust key
    // Use the centralized memory store
    // Assuming saveVoteResults takes the user's vote and merges it
    await saveVoteResults(voteId, { [userVoteKey]: points });
    console.log('[VotePage] Saved results via submitVote for user:', userVoteKey);
};

// Mock function to propose a candidate
const proposeCandidate = async (voteId: string, candidateName: string): Promise<boolean> => {
    console.log(`Proposing candidate "${candidateName}" for vote ${voteId}`);
    await new Promise(resolve => setTimeout(resolve, 600));
    // TODO: Implement actual backend call with AI check
    return true; // Simulate success for now
}

const VOTE_STORAGE_KEY_PREFIX = 'vote_casted_'; // No longer used for hasVoted check
const VOTE_POINTS_KEY_PREFIX = 'vote_points_'; // Used for draft saving
const USER_IDENTIFIER_KEY = 'userIdentifier'; // Consistent user identifier

// Function to get or create a unique user identifier
const getUserIdentifier = (): string => {
  // Ensure this only runs client-side
  if (typeof window === 'undefined') return 'server-user';
  let userId = localStorage.getItem(USER_IDENTIFIER_KEY);
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    try {
      localStorage.setItem(USER_IDENTIFIER_KEY, userId);
    } catch (e) {
      console.error("Failed to set user identifier in localStorage:", e);
      return `fallback-user-${Date.now()}`; // Fallback if storage fails
    }
  }
  return userId;
};

export default function VotePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const voteId = params.voteId as string;
    const [userId, setUserId] = useState<string>(""); // State for user ID

    const [voteDetails, setVoteDetails] = useState<VoteDetails | null>(null);
    const [candidatePoints, setCandidatePoints] = useState<CandidatePoints>({});
    const [totalPoints, setTotalPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [hasVoted, setHasVoted] = useState<boolean | null>(null); // Use null initially
    const [newCandidateName, setNewCandidateName] = useState("");
    const [proposing, setProposing] = useState(false);

    // Generate user ID client-side only
    useEffect(() => {
        setUserId(getUserIdentifier());
    }, []);

    const votePointsKey = userId ? `${VOTE_POINTS_KEY_PREFIX}${voteId}_${userId}` : null; // User-specific key

    // Fetch vote details, check if user voted, load points
    useEffect(() => {
        // Ensure we have voteId and userId before fetching
        if (voteId && userId) {
            const fetchData = async () => {
                setLoading(true);
                setHasVoted(null); // Reset while loading
                try {
                    const details = await getVoteDetails(voteId);
                    if (!details) {
                        setError('Vote details not found.');
                        return;
                    }
                    setVoteDetails(details);

                    const allResults = await getVoteResults(voteId) || {};
                    const userHasVotedResult = !!allResults[userId]; // Check if user ID exists in results
                    setHasVoted(userHasVotedResult);

                    let initialPoints: CandidatePoints = {};
                    if (userHasVotedResult) {
                        initialPoints = allResults[userId];
                    } else {
                        details.candidates.forEach(c => initialPoints[c.name] = 0);
                    }
                    setCandidatePoints(initialPoints);

                } catch (err) {
                    console.error("[VotePage] Error fetching data:", err);
                    setError('Failed to load vote details or results.');
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [voteId, userId]);

    // Update total points and save draft to local storage
    useEffect(() => {
        const sum = Object.values(candidatePoints).reduce((acc, points) => acc + points, 0);
        setTotalPoints(sum);

        // Save current point distribution as a draft if not already voted and we have a key
        if (hasVoted === false && votePointsKey && Object.keys(candidatePoints).length > 0) {
             try {
                localStorage.setItem(votePointsKey, JSON.stringify(candidatePoints));
            } catch (e) {
                console.warn("[VotePage] Failed to save draft points to local storage:", e);
            }
        }
    }, [candidatePoints, hasVoted, votePointsKey]);

    // Load draft points on initial load if not voted
    useEffect(() => {
        if (loading === false && hasVoted === false && voteDetails && votePointsKey) {
             try {
                const savedPointsString = localStorage.getItem(votePointsKey);
                if (savedPointsString) {
                    const savedPoints = JSON.parse(savedPointsString);
                    const currentCandidateNames = new Set(voteDetails.candidates.map(c => c.name));
                    const savedCandidateNames = Object.keys(savedPoints);
                    if (savedCandidateNames.every(name => currentCandidateNames.has(name))) {
                        // Only set if different from initial zero state
                        if (JSON.stringify(savedPoints) !== JSON.stringify(candidatePoints)) {
                            setCandidatePoints(savedPoints);
                            console.log("[VotePage] Loaded draft points from local storage.");
                        }
                    } else {
                        console.warn("[VotePage] Discarding stale draft points from local storage.");
                        localStorage.removeItem(votePointsKey);
                    }
                }
            } catch (e) {
                console.error("[VotePage] Failed to parse draft points from local storage:", e);
                localStorage.removeItem(votePointsKey); // Clear invalid data
            }
        }
        // Run only when loading finishes, vote status is known, details are present, and key is available
    }, [loading, hasVoted, voteDetails, votePointsKey, candidatePoints]); // Added candidatePoints to dependency to avoid loop if initial state is the same as draft

    const handleSliderChange = (candidateName: string, value: number[]) => {
        const newPoints = value[0];
        const currentPoints = candidatePoints[candidateName] || 0;
        const diff = newPoints - currentPoints;
        const newTotal = totalPoints + diff;

        // Allow exceeding 100 temporarily, validation happens on submit
        setCandidatePoints(prev => ({ ...prev, [candidateName]: newPoints }));
    };

    const handleVoteSubmit = async () => {
        if (hasVoted) {
            toast({ title: "Already Voted", description: "Your vote has already been recorded.", variant: "default" });
            return;
        }
        if (totalPoints !== 100) {
            toast({ title: "Invalid Point Total", description: `You must allocate exactly 100 points. Currently: ${totalPoints}`, variant: "destructive" });
            return;
        }
        if (!voteDetails || voteDetails.status !== 'Open') {
            toast({ title: "Voting Closed", description: "This vote is not currently open for submissions.", variant: "destructive" });
            return;
        }
        // Ensure userId is available
        if (!userId) {
             toast({ title: "User Error", description: "Cannot submit vote without a user identifier.", variant: "destructive" });
             return;
        }

        setSubmitting(true);
        try {
            // Pass the specific user's points
            await saveVoteResults(voteId, { [userId]: candidatePoints });
            toast({ title: "Vote Submitted Successfully!", description: "Your points have been recorded.", variant: "default" }); // Use default variant
            setHasVoted(true);
            if (votePointsKey) localStorage.removeItem(votePointsKey); // Clear draft points after successful submission
            router.push(`/vote/${voteId}/results`);
        } catch (err) {
            console.error("[VotePage] Vote Submission Failed:", err);
            toast({ title: "Submission Error", description: "Could not record your vote. Please try again.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleProposeCandidate = async () => {
       if (!newCandidateName.trim()) {
            toast({ title: "Candidate name cannot be empty", variant: "destructive" });
            return;
        }
        if (voteDetails?.candidates.some(c => c.name.toLowerCase() === newCandidateName.trim().toLowerCase())) {
            toast({ title: "Candidate already exists", variant: "destructive" });
            return;
        }
        if (voteDetails?.status !== 'Pending') {
            toast({ title: "Proposal Period Ended", description: "Candidates can only be proposed before voting opens.", variant: "destructive" });
            return;
        }
        setProposing(true);
        try {
            const success = await proposeCandidate(voteId, newCandidateName.trim());
            if (success) {
                toast({ title: "Candidate Proposed!", description: "It will be reviewed shortly.", variant: "default" }); // Use default variant
                setNewCandidateName("");
                // Refresh data to show proposed candidate (or inform user)
                // Simpler approach: fetchData(); // Re-trigger the fetch effect
                // More complex: Optimistic UI update
            } else {
                toast({ title: "Failed to Propose Candidate", description: "Could not add the candidate.", variant: "destructive" });
            }
        } catch (err) {
            console.error("Error proposing candidate:", err);
            toast({ title: "Proposal Error", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setProposing(false);
        }
    };


    // --- Render Logic --- //

    if (loading || hasVoted === null) { // Show loading until vote status is confirmed
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
                <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-4 text-xl text-muted-foreground">Loading Vote...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="max-w-2xl mx-auto mt-10">
                <BanIcon className="h-4 w-4" />
                <AlertTitle>Error Loading Vote</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!voteDetails) {
        return (
            <Alert variant="default" className="max-w-2xl mx-auto mt-10">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Vote Not Found</AlertTitle>
                <AlertDescription>The requested vote does not exist or could not be loaded.</AlertDescription>
            </Alert>
        );
    }

    const canPropose = voteDetails.status === 'Pending';
    const isVotingOpen = voteDetails.status === 'Open';
    const isClosed = voteDetails.status === 'Closed';
    const canSubmit = isVotingOpen && !hasVoted && totalPoints === 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <Card className="shadow-lg border border-border/50 overflow-hidden">
                    <CardHeader className="bg-card/80 border-b border-border/50 p-6">
                        <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            {voteDetails.voteName}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground mt-1">
                            {isVotingOpen && !hasVoted && "Distribute 100 points among the candidates below."}
                            {isVotingOpen && hasVoted && "Your vote has been submitted."}
                            {isClosed && "Voting has closed."}
                            {canPropose && "Proposal phase: Suggest candidates before voting starts."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        {hasVoted && (
                            <Alert variant="default"> {/* Use default variant */} 
                                <CheckCircle2Icon className="h-4 w-4" />
                                <AlertTitle>Vote Recorded</AlertTitle>
                                <AlertDescription>
                                    Your allocation has been saved. You can view the results after the vote closes.
                                </AlertDescription>
                            </Alert>
                        )}
                        {isClosed && (
                            <Alert variant="default"> {/* Use default variant */} 
                                <InfoIcon className="h-4 w-4" />
                                <AlertTitle>Voting Closed</AlertTitle>
                                <AlertDescription>
                                    This vote is no longer accepting submissions.
                                </AlertDescription>
                            </Alert>
                        )}

                        {isVotingOpen && (
                            <div className="space-y-5">
                                {voteDetails.candidates.map(({ name }) => (
                                    <div key={name} className="space-y-2">
                                        <Label htmlFor={`slider-${name}`} className="text-base font-medium flex justify-between items-center">
                                            <span>{name}</span>
                                            <span className={cn(
                                                "font-semibold tabular-nums px-2 py-0.5 rounded",
                                                candidatePoints[name] > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                            )}>
                                                {candidatePoints[name] || 0}
                                            </span>
                                        </Label>
                                        <Slider
                                            id={`slider-${name}`}
                                            value={[candidatePoints[name] || 0]}
                                            max={100}
                                            step={1}
                                            onValueChange={(value) => handleSliderChange(name, value)}
                                            disabled={hasVoted || submitting}
                                            className={cn("transition-opacity", (hasVoted || submitting) && "opacity-50 cursor-not-allowed")}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {canPropose && (
                            <div className="space-y-3 pt-4 border-t border-border/50">
                                <Label htmlFor="new-candidate" className="text-base font-semibold">Propose a New Candidate</Label>
                                <div className="flex gap-3">
                                    <Input
                                        id="new-candidate"
                                        placeholder="Enter candidate name"
                                        value={newCandidateName}
                                        onChange={(e) => setNewCandidateName(e.target.value)}
                                        disabled={proposing}
                                        className="flex-grow transition-colors focus:ring-primary focus:border-primary"
                                    />
                                    <Button
                                        onClick={handleProposeCandidate}
                                        disabled={proposing || !newCandidateName.trim()}
                                        variant="secondary"
                                        className="transition-colors whitespace-nowrap"
                                    >
                                        {proposing ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Propose
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">New candidates require approval.</p>
                            </div>
                        )}
                    </CardContent>

                    {(isVotingOpen || isClosed) && (
                        <CardFooter className="bg-muted/50 border-t border-border/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            {isVotingOpen && (
                                <div className="w-full sm:w-auto flex-grow">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium text-foreground">Total Points Allocated:</span>
                                        <span className={cn(
                                            "text-lg font-bold tabular-nums",
                                            totalPoints === 100 ? "text-green-600 dark:text-green-400" :
                                            totalPoints > 100 ? "text-destructive" : "text-foreground"
                                        )}>
                                            {totalPoints} / 100
                                        </span>
                                    </div>
                                    <Progress value={Math.min(totalPoints, 100)} className="h-2" />
                                    {totalPoints > 100 && <p className="text-xs text-destructive mt-1 text-right">Reduce points to reach 100.</p>}
                                </div>
                            )}

                            {isVotingOpen && !hasVoted && (
                                <Button
                                    onClick={handleVoteSubmit}
                                    disabled={!canSubmit || submitting}
                                    className="w-full sm:w-auto px-6 py-3 text-lg font-semibold transition-colors bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {submitting ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : null}
                                    {submitting ? "Submitting..." : "Submit Vote"}
                                </Button>
                            )}

                            {(isClosed || hasVoted) && (
                                <Button
                                    onClick={() => router.push(`/vote/${voteId}/results`)}
                                    variant="outline"
                                    className="w-full sm:w-auto transition-colors border-primary text-primary hover:bg-accent"
                                >
                                    View Results <ArrowRightIcon className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
}
