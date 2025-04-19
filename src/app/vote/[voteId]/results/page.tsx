'use client'

import { useEffect, useState } from 'react';
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
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Renamed import

// Interfaces and fetch function (keep as is, ensure fetch handles details/results correctly)
interface VoteData {
  voteName: string;
  candidates: { name: string; points: number }[];
  status: 'Open' | 'Closed' | 'Pending';
  voteUrl: string;
  creatorToken?: string;
  maxVoters?: number; // Added for display
  // Consider adding pointsPerVoter if set
}

const fetchVoteData = async (voteId: string): Promise<VoteData | null> => {
  console.log(`Fetching data for vote: ${voteId}`);
  await new Promise(resolve => setTimeout(resolve, 300)); // Shorter delay simulation

  try {
    const [details, results] = await Promise.all([
      getVoteDetails(voteId),
      getVoteResults(voteId)
    ]);

    console.log(`[ResultsPage] Fetched details for ${voteId}:`, details);
    console.log(`[ResultsPage] Fetched results for ${voteId}:`, results);

    if (!details) {
      console.error(`Vote details not found for ${voteId}`);
      return null;
    }

    const aggregatedResults: { [candidateName: string]: number } = {};
    if (results) {
      for (const userResults of Object.values(results)) {
        if (typeof userResults === 'object' && userResults !== null) {
          for (const [candidateName, points] of Object.entries(userResults)) {
            if (typeof points === 'number') {
              aggregatedResults[candidateName] = (aggregatedResults[candidateName] || 0) + points;
            }
          }
        }
      }
    }

    const candidatesWithPoints = details.candidates.map(candidate => ({
      name: candidate.name,
      points: aggregatedResults[candidate.name] || 0
    }));

    // Ensure voteUrl generation happens client-side or uses env var for domain
    const voteUrl = typeof window !== 'undefined' ? `${window.location.origin}/vote/${voteId}` : '';

    return {
      voteName: details.voteName,
      candidates: candidatesWithPoints,
      status: details.status,
      voteUrl: voteUrl,
      creatorToken: details.creatorToken,
      maxVoters: details.maxVoters, // Pass maxVoters
    };
  } catch (error) {
    console.error(`[ResultsPage] Error fetching vote data for ${voteId}:`, error);
    return null; // Return null on error
  }
};

// Predefined chart colors from globals.css variables (ideally load these dynamically)
const CHART_COLORS = [
  'hsl(var(--chart-1))', // Teal
  'hsl(var(--chart-2))', // Orange
  'hsl(var(--chart-3))', // Purple
  'hsl(var(--chart-4))', // Yellow
  'hsl(var(--chart-5))', // Green
];

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

  // Get user identifier client-side
  useEffect(() => {
    setCurrentUserToken(getUserIdentifier());
  }, []);

  // Fetch data and check creator status
  useEffect(() => {
    if (voteId && currentUserToken) { // Ensure token is available
      setLoading(true);
      fetchVoteData(voteId)
        .then(data => {
          if (data) {
            setVoteData(data);
            setIsCreator(data.creatorToken === currentUserToken);
          } else {
            setError('Vote not found or could not be loaded.');
          }
        })
        .catch(err => {
          console.error("Error fetching vote data:", err);
          setError('Failed to load vote data. Please try again later.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
    // TODO: Implement live updates (polling or websockets)

  }, [voteId, currentUserToken]); // Depend on currentUserToken

  const handleCopyToClipboard = () => {
    if (!voteData?.voteUrl) return;
    navigator.clipboard.writeText(voteData.voteUrl)
      .then(() => {
        setHasCopied(true);
        toast({ title: "Link Copied!", description: "Vote link copied to clipboard." });
        setTimeout(() => setHasCopied(false), 2000); // Reset icon after 2s
      })
      .catch(err => {
        console.error("Failed to copy link:", err);
        toast({ title: "Copy Failed", description: "Could not copy link to clipboard.", variant: "destructive" });
      });
  };

  const handleCloseVote = async () => {
      if (!isCreator || !voteId || !currentUserToken) return;
      setIsClosing(true);
      setError(null);
      try {
        // Re-use creator token fetched earlier
        const response = await fetch(`/api/vote/${voteId}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creatorToken: currentUserToken }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to close the vote.');
        }
        setVoteData(prevData => prevData ? { ...prevData, status: 'Closed' } : null);
        toast({ title: "Vote Closed Successfully", variant: "default" }); // Changed variant
      } catch (err: any) {
          console.error("Error closing vote:", err);
          setError(err.message || 'An error occurred while closing the vote.');
          toast({ title: "Error Closing Vote", description: err.message, variant: "destructive" });
      } finally {
          setIsClosing(false);
      }
  };

  const getStatusBadgeVariant = (status: VoteData['status']) => {
    switch (status) {
      case 'Open': return 'secondary'; // Changed from 'success' to 'secondary'
      case 'Closed': return 'destructive'; // Use destructive for closed
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

  const totalPointsSum = voteData.candidates.reduce((sum, c) => sum + c.points, 0);
  const hasResults = totalPointsSum > 0;

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header Card with Title, Status, and Actions */}
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

          {/* Results Chart */} 
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Results Breakdown</h3>
            {hasResults ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={voteData.candidates} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
                    <Tooltip
                        cursor={{ fill: 'hsla(var(--accent), 0.5)' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                      {voteData.candidates.map((entry, index) => (
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

        {/* QR Code Card (Optional - could be integrated elsewhere) */} 
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
                              bgColor="#FFFFFF" // Use white background
                              fgColor="#000000" // Use black foreground
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
