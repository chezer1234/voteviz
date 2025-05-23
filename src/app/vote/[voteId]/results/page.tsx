'use client'

import { useEffect, useState, useRef } from 'react'; // Added useRef
import { useParams, useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getVoteDetails, getVoteResults } from '@/lib/memory-store';
import { getUserIdentifier } from '@/lib/user-identifier';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2Icon, InfoIcon, BanIcon, Share2Icon, CopyIcon, CheckIcon, XCircleIcon, LockIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interfaces and fetch function (keep as is, ensure fetch handles details/results correctly)
interface VoteData {
  voteName: string;
  candidates: { name: string; points: number }[];
  status: 'Open' | 'Closed' | 'Pending';
  voteUrl: string;
  creatorToken?: string;
  maxVoters?: number; // Added for display
  gradualRevealEnabled?: boolean; // Add gradual reveal setting
  revealDuration?: number; // Add reveal duration setting
}

const fetchVoteData = async (voteId: string): Promise<VoteData | null> => {
  console.log(`[ResultsPage] Fetching data for vote: ${voteId}`);
  // No artificial delay needed here anymore
  // await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const [details, results] = await Promise.all([
      getVoteDetails(voteId),
      getVoteResults(voteId)
    ]);

    console.log(`[ResultsPage] Fetched details for ${voteId}:`, details);
    console.log(`[ResultsPage] Fetched results for ${voteId}:`, results);

    if (!details) {
      console.error(`[ResultsPage] Vote details not found for ${voteId}`);
      return null;
    }

    // Aggregate results from all users
    const aggregatedResults: { [candidateName: string]: number } = {};
    if (results) {
        // results is now { userId1: { cand1: pts, ... }, userId2: { cand1: pts, ... } }
        console.log(`[ResultsPage] Processing results for ${voteId} with ${Object.keys(results).length} user results`);
        for (const userId of Object.keys(results)) {
            const userResults = results[userId];
            console.log(`[ResultsPage] Processing results from user ${userId}:`, userResults);
            if (typeof userResults === 'object' && userResults !== null) {
                for (const [candidateName, points] of Object.entries(userResults)) {
                    if (typeof points === 'number') {
                        aggregatedResults[candidateName] = (aggregatedResults[candidateName] || 0) + points;
                        console.log(`[ResultsPage] Adding ${points} points to ${candidateName}, total: ${aggregatedResults[candidateName]}`);
                    }
                }
            }
        }
    }
    
    console.log(`[ResultsPage] Final aggregated results:`, aggregatedResults);
    
    const candidatesWithPoints = details.candidates.map(candidate => ({
      name: candidate.name,
      points: aggregatedResults[candidate.name] || 0
    }));
    
    console.log(`[ResultsPage] Candidates with points:`, candidatesWithPoints);

    // Ensure voteUrl generation happens client-side or uses env var for domain
    const voteUrl = typeof window !== 'undefined' ? `${window.location.origin}/vote/${voteId}` : '';

    return {
      voteName: details.voteName,
      candidates: candidatesWithPoints,
      status: details.status,
      voteUrl: voteUrl,
      creatorToken: details.creatorToken,
      maxVoters: details.maxVoters,
      gradualRevealEnabled: details.gradualRevealEnabled, // Add gradual reveal settings
      revealDuration: details.revealDuration, // Add reveal duration
    };
  } catch (error) {
    console.error(`[ResultsPage] Error fetching vote data for ${voteId}:`, error);
    return null; // Return null on error
  }
};

// Predefined chart colors from globals.css variables
const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'
];

const POLLING_INTERVAL = 5000; // Poll every 5 seconds

// CustomTooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border border-border rounded-md shadow-md">
        <p className="font-semibold text-sm">{`${label}`}</p>
        <p className="text-muted-foreground text-xs">Votes: {payload[0].value}</p>
      </div>
    );
  }

  return null;
};

export default function VoteResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const voteId = params.voteId as string;

  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [currentUserToken, setCurrentUserToken] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store interval ID
  
  // Gradual reveal state variables
  const [isRevealing, setIsRevealing] = useState(false);
  const [displayedCandidates, setDisplayedCandidates] = useState<{ name: string; points: number }[]>([]);
  const [finalCandidates, setFinalCandidates] = useState<{ name: string; points: number }[]>([]);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get user identifier client-side
  useEffect(() => {
    setCurrentUserToken(getUserIdentifier());
  }, []);

  // Function to fetch and update data
  const loadData = async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const data = await fetchVoteData(voteId);
      if (data) {
        setVoteData(data);
        
        // Initialize/update displayedCandidates - hide points if gradual reveal is enabled
        if (!isRevealing) {
          const updatedCandidates = data.candidates.map(c => ({
            name: c.name,
            // Hide points if gradual reveal is enabled (regardless of vote status)
            // Only show points if gradual reveal is disabled or we're currently revealing
            points: data.gradualRevealEnabled ? 0 : c.points
          }));
          setDisplayedCandidates(updatedCandidates);
        }
        
        if (currentUserToken) { // Check if token is already set
          setIsCreator(data.creatorToken === currentUserToken);
        }
        // If vote is closed, stop polling
        if (data.status === 'Closed' && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          console.log("[ResultsPage] Vote closed, stopping polling.");
        }
      } else {
        setError('Vote not found or could not be loaded.');
        if (intervalRef.current) clearInterval(intervalRef.current); // Stop polling on error
      }
    } catch (err) {
      console.error("Error in loadData:", err);
      setError('Failed to load vote data. Please try again later.');
      if (intervalRef.current) clearInterval(intervalRef.current); // Stop polling on error
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  // Initial data load and creator check
  useEffect(() => {
    if (voteId && currentUserToken) {
      loadData(true); // Pass true for initial load
    }
  }, [voteId, currentUserToken]); // Depend on voteId and currentUserToken

  // Set up polling
  useEffect(() => {
    // Start polling only if voteData exists and status is Open
    if (voteData && voteData.status === 'Open' && !intervalRef.current) {
      console.log("[ResultsPage] Vote is open, starting polling.");
      intervalRef.current = setInterval(() => {
        console.log("[ResultsPage] Polling for updates...");
        loadData(); // Fetch updates without setting loading state
      }, POLLING_INTERVAL);
    }

    // Cleanup function to clear interval on component unmount or status change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("[ResultsPage] Cleaning up polling interval.");
      }
    };
  }, [voteId, voteData?.status]); // Depend on voteId and vote status

  // Start gradual reveal
  const startGradualReveal = async () => {
    if (!voteData || !voteData.gradualRevealEnabled || voteData.status !== 'Closed') return;
    
    setIsRevealing(true);
    
    // Make one final data fetch to get the definitive final results
    try {
      const finalData = await fetchVoteData(voteId);
      if (!finalData) {
        throw new Error('Could not fetch final vote data');
      }
      
      // Store the final results that we're animating towards
      setFinalCandidates(finalData.candidates);
      
      // Reset displayed candidates to 0 points to start the animation
      const zeroCandidates = finalData.candidates.map(c => ({
        name: c.name,
        points: 0
      }));
      setDisplayedCandidates(zeroCandidates);
      
      // Start the animation ticker
      const revealDuration = finalData.revealDuration || 30; // Default to 30 seconds if not specified
      const tickInterval = 200; // Update every 200ms for smooth animation
      const totalTicks = (revealDuration * 1000) / tickInterval;
      let currentTick = 0;
      
      // Clear any existing timer
      if (revealTimerRef.current) {
        clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      
      // Start animation timer
      revealTimerRef.current = setInterval(() => {
        currentTick++;
        
        if (currentTick >= totalTicks) {
          // Animation complete, set to final values
          setDisplayedCandidates(finalData.candidates);
          setIsRevealing(false);
          
          // Clear the interval
          if (revealTimerRef.current) {
            clearInterval(revealTimerRef.current);
            revealTimerRef.current = null;
          }
          
          toast({
            title: "Reveal Complete",
            description: "Final results are now displayed."
          });
          return;
        }
        
        // Calculate how much progress we've made (0 to 1)
        const progress = currentTick / totalTicks;
        
        // Update displayed candidates with randomized increments
        setDisplayedCandidates(prev => {
          const updated = [...prev];
          
          // Choose random candidates to increment in this tick
          const candidatesToUpdate = Math.max(1, Math.floor(Math.random() * 3)); // 1-2 candidates at a time
          const candidateIndices = Array.from(Array(updated.length).keys())
            .sort(() => Math.random() - 0.5)
            .slice(0, candidatesToUpdate);
            
          // Update the randomly selected candidates
          candidateIndices.forEach(index => {
            const candidate = updated[index];
            const finalPoints = finalData.candidates[index].points;
            
            // Calculate target points for this tick based on progress
            // but add some randomness for dramatic effect
            const targetPoints = Math.floor(finalPoints * progress);
            
            // Only increase if we haven't reached the target yet
            if (candidate.points < targetPoints) {
              // Add a small random increment
              const increment = Math.max(1, Math.floor(Math.random() * 5));
              // Ensure we don't exceed the final value
              updated[index] = {
                ...candidate,
                points: Math.min(finalPoints, candidate.points + increment)
              };
            }
          });
          
          return updated;
        });
        
      }, tickInterval);
      
    } catch (error) {
      console.error('Error starting gradual reveal:', error);
      setIsRevealing(false);
      toast({
        title: "Error Starting Reveal",
        description: "Could not initialize the results reveal.",
        variant: "destructive"
      });
    }
  };
  
  // Clean up animation timer on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, []);
  
  const handleCopyToClipboard = () => {
    if (!voteData?.voteUrl) return;
    navigator.clipboard.writeText(voteData.voteUrl)
      .then(() => {
        setHasCopied(true);
        toast({ title: "Link Copied!", description: "Vote link copied to clipboard." });
        setTimeout(() => setHasCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy link:", err);
        toast({ title: "Copy Failed", description: "Could not copy link to clipboard.", variant: "destructive" });
      });
  };

  const handleCloseVote = async () => {
      if (!isCreator || !voteId || !currentUserToken || voteData?.status !== 'Open') return;
      setIsClosing(true);
      setError(null);
      if (intervalRef.current) { // Clear interval immediately when attempting to close
          clearInterval(intervalRef.current);
          intervalRef.current = null;
      }
      try {
        const response = await fetch(`/api/vote/${voteId}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creatorToken: currentUserToken }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to close the vote.');
        }
        // Update local state immediately and stop polling (already done)
        setVoteData(prevData => prevData ? { ...prevData, status: 'Closed' } : null);
        toast({ title: "Vote Closed Successfully", variant: "default" });
      } catch (err: any) {
          console.error("Error closing vote:", err);
          setError(err.message || 'An error occurred while closing the vote.');
          toast({ title: "Error Closing Vote", description: err.message, variant: "destructive" });
          // Optionally restart polling if the close failed and status is still Open? Might be complex.
      } finally {
          setIsClosing(false);
      }
  };

  const getStatusBadgeVariant = (status: VoteData['status']) => {
    switch (status) {
      case 'Open': return 'secondary';
      case 'Closed': return 'destructive';
      case 'Pending': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: VoteData['status']) => {
      switch (status) {
          case 'Open': return 'Voting is currently active.';
          case 'Closed': return 'Voting has ended.';
          case 'Pending': return 'Voting has not started yet.';
          default: return 'Unknown status.';
      }
  }

  // --- Render Logic --- //

  if (loading) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
            <span className="ml-4 text-xl text-muted-foreground">Loading Results...</span>
        </div>
    );
  }

  if (error) {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-10">
            <BanIcon className="h-4 w-4" />
            <AlertTitle>Error Loading Results</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }

  if (!voteData) {
    return (
        <Alert variant="default" className="max-w-2xl mx-auto mt-10">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Vote Not Found</AlertTitle>
            <AlertDescription>The requested vote data could not be loaded.</AlertDescription>
        </Alert>
    );
  }

  const totalPointsSum = displayedCandidates.reduce((sum, c) => sum + c.points, 0);
  const hasResults = totalPointsSum > 0;

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header Card */}
        <Card className="shadow-lg border border-border/50 overflow-hidden">
          <CardHeader className="bg-card/80 border-b border-border/50 p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {voteData.voteName}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                {getStatusText(voteData.status)} (ID: {voteId})
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={getStatusBadgeVariant(voteData.status)} className="text-sm px-3 py-1">
                  {voteData.status}
              </Badge>
              {isCreator && voteData.status === 'Open' && (
                  <ShadTooltip>
                      <TooltipTrigger asChild>
                          <Button
                              variant="destructive"
                              size="icon"
                              onClick={handleCloseVote}
                              disabled={isClosing}
                              className="transition-colors"
                          >
                              {isClosing ? <Loader2Icon className="h-4 w-4 animate-spin"/> : <LockIcon className="h-4 w-4"/>}
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                          <p>Close Voting</p>
                      </TooltipContent>
                  </ShadTooltip>
              )}
            </div>
          </CardHeader>

          {/* Share Section */}
          {voteData.status === 'Open' && (
            <CardContent className="p-6 border-b border-border/50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/50 p-4 rounded-lg border border-dashed">
                <div className="flex items-center gap-3">
                  <Share2Icon className="h-6 w-6 text-primary flex-shrink-0"/>
                  <div>
                    <h3 className="font-semibold text-foreground">Share this Vote</h3>
                    <p className="text-sm text-muted-foreground">Use the link or QR code to invite others.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input readOnly value={voteData.voteUrl} className="flex-grow text-sm bg-background" />
                  <ShadTooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handleCopyToClipboard} className="transition-colors flex-shrink-0">
                            {hasCopied ? <CheckIcon className="h-4 w-4 text-green-500"/> : <CopyIcon className="h-4 w-4"/>}
                        </Button>
                    </TooltipTrigger>
                     <TooltipContent>
                        <p>Copy Link</p>
                    </TooltipContent>
                  </ShadTooltip>
                </div>
              </div>
            </CardContent>
          )}

          {/* Gradual Reveal Button - Only show when vote is closed, user is creator, and reveal is enabled */}
          {isCreator && voteData.status === 'Closed' && voteData.gradualRevealEnabled && !isRevealing && (
            <CardContent className="p-6 border-b border-border/50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-primary/10 p-4 rounded-lg border border-dashed border-primary/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                      <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Gradual Reveal Available</h3>
                    <p className="text-sm text-muted-foreground">Start a dramatic animated reveal of the final results.</p>
                  </div>
                </div>
                <Button 
                  variant="default" 
                  onClick={startGradualReveal} 
                  className="px-4 transition-colors"
                >
                  Start Reveal
                </Button>
              </div>
            </CardContent>
          )}

          {/* Revealing Status Indicator */}
          {isRevealing && (
            <CardContent className="p-4 border-b border-border/50 bg-primary/5">
              <div className="flex items-center justify-center gap-2">
                <Loader2Icon className="h-5 w-5 animate-spin text-primary"/>
                <p className="text-sm font-medium text-primary">Revealing Results...</p>
              </div>
            </CardContent>
          )}

          {/* Results Chart */}
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-foreground">
              Results Breakdown
              {isRevealing && <span className="ml-2 text-sm font-normal text-primary">(Revealing...)</span>}
            </h3>
            {voteData.gradualRevealEnabled && !isRevealing && totalPointsSum === 0 ? (
              <div className="text-center py-10 bg-primary/5 rounded-lg border border-dashed border-primary/30">
                {voteData.status === 'Closed' && isCreator ? (
                  <div className="space-y-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                      <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                    </svg>
                    <p className="text-muted-foreground">The results are ready to be revealed.</p>
                    <p className="font-semibold text-primary">Click the "Start Reveal" button above to begin the dramatic reveal!</p>
                  </div>
                ) : voteData.status === 'Closed' ? (
                  <div className="space-y-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <p className="text-muted-foreground">Results are hidden until revealed by the vote creator.</p>
                    <p className="font-medium">Please wait for the vote creator to start the dramatic reveal!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <p className="text-muted-foreground">Results are hidden until the vote is closed.</p>
                    <p className="font-medium">A dramatic reveal will be available once voting has ended.</p>
                  </div>
                )}
              </div>
            ) : hasResults || isRevealing ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={displayedCandidates} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'hsla(var(--accent), 0.5)' }}
                    />
                    <Bar dataKey="points" radius={[4, 4, 0, 0]} animationDuration={300}>
                      {displayedCandidates.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <XCircleIcon className="mx-auto h-10 w-10 mb-2"/>
                <p>No results submitted yet.</p>
              </div>
            )}
          </CardContent>

          {/* Footer Actions */}
          <CardFooter className="bg-muted/50 border-t border-border/50 p-6 flex justify-end gap-3">
             {voteData.status === 'Open' && (
                <Button variant="outline" onClick={() => router.push(`/vote/${voteId}`)} className="transition-colors">
                    Go to Voting Page
                </Button>
             )}
              <Button variant="secondary" onClick={() => router.push('/')} className="transition-colors">
                Create New Vote
            </Button>
          </CardFooter>
        </Card>

        {/* QR Code Card */}
        {voteData.status === 'Open' && (
            <Card className="shadow-lg border border-border/50">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold">Scan to Vote</CardTitle>
                    <CardDescription>Share this QR code for easy access.</CardDescription>
                </CardHeader>
                 <CardContent className="flex justify-center items-center p-6">
                    {voteData.voteUrl ? (
                        <div style={{ padding: '4px', background: 'white', borderRadius: '8px' }}>
                          <QRCodeCanvas
                              value={voteData.voteUrl}
                              size={160}
                              bgColor="#FFFFFF"
                              fgColor="#000000"
                              level="Q"
                          />
                        </div>
                    ) : (
                        <p className="text-muted-foreground">QR code unavailable.</p>
                    )}
                </CardContent>
            </Card>
        )}

      </div>
    </div>
    </TooltipProvider>
  );
}
