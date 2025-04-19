'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Import Button
import { getVoteResults } from '@/lib/memory-store';

// Mock data structure (replace with actual data fetching)
interface VoteData {
  voteName: string;
  candidates: { name: string; points: number }[];
  status: 'Open' | 'Closed' | 'Passed';
  voteUrl: string;
}

// In-memory store for vote data (replace with actual backend)
// let voteResults: { [voteId: string]: { [candidateName: string]: number } } = {};

// Mock data fetching function (now fetches from in-memory store)
const fetchVoteData = async (voteId: string): Promise<VoteData | null> => {
  console.log(`Fetching data for vote: ${voteId}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const results = await getVoteResults(voteId);

  if (!results) {
    return null;
  }

   // Transform the results into the format expected by the component
  const candidates = Object.entries(results).map(([name, points]) => ({
    name,
    points,
  }));

  // Get voteName and candidateName from local storage
  const voteName = localStorage.getItem('voteName');
    
  return {
    voteName: voteName || "Favorite Color Vote", // Hardcoded Name
    candidates: candidates,
    status: 'Open', //Hardcoded Status
    voteUrl: `${window.location.origin}/vote/${voteId}`
  };
};

export default function VoteResultsPage() {
  const params = useParams();
  const router = useRouter();
  const voteId = params.voteId as string;
  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (voteId) {
      fetchVoteData(voteId)
        .then(data => {
          if (data) {
            setVoteData(data);
          } else {
            setError('Vote not found.');
          }
        })
        .catch(err => {
          console.error("Error fetching vote data:", err);
          setError('Failed to load vote data.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setError('No vote ID provided.');
      setLoading(false)
    }

    // TODO: Implement live updates (e.g., via WebSockets or polling)
    // This would involve setting up an interval or socket connection
    // to periodically re-fetch or receive updated vote data.

  }, [voteId]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading results...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!voteData) {
    return <div className="container mx-auto p-4 text-center">No vote data available.</div>;
  }

  // Determine badge color based on status
  const getStatusBadgeVariant = (status: VoteData['status']) => {
    switch (status) {
      case 'Open': return 'secondary';
      case 'Closed': return 'outline';
      case 'Passed': return 'default'; // Using default Shadcn green-ish
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Vote Results: {voteData.voteName}</CardTitle>
          <CardDescription>Live results and details for vote ID: {voteId}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-center">
           {/* Status Display */}
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Status</h3>
            <Badge variant={getStatusBadgeVariant(voteData.status)}>{voteData.status}</Badge>
          </div>

           {/* QR Code Section */}
           <div className="text-center p-4 border rounded">
            <h3 className="font-semibold mb-2">Scan to Vote</h3>
            {voteData.voteUrl ? (
              <QRCodeCanvas value={voteData.voteUrl} size={128} />
            ) : (
              <p>Could not generate QR code.</p>
            )}
            <p className="text-xs mt-2">Scan this code to go to the voting page.</p>
          </div>
        </CardContent>
      </Card>

      {/* Live Results Bar Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>Live Results</CardTitle>
          <CardDescription>Point distribution across candidates.</CardDescription>
        </CardHeader>
        <CardContent style={{ width: '100%', height: 300 }}>
           <ResponsiveContainer>
            <BarChart
              data={voteData.candidates}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="points" fill="#3498db" /> {/* Using blue from blueprint */}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Placeholder for Manual Close Button (if needed and vote is Open) */}
      {voteData.status === 'Open' && (
          <Card>
              <CardHeader>
                  <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent>
                {/* TODO: Implement Manual Close functionality (requires backend) */}
                 <Button variant="destructive" disabled>Close Vote Manually (Requires Backend)</Button>
                 <CardDescription className="mt-2">This action would typically require authentication and backend integration.</CardDescription>
              </CardContent>
          </Card>
      )}

    </div>
  );
}
