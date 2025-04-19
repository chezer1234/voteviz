'use client'

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCodeCanvas from 'qrcode.react'; // Correct import for QR code
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data structure (replace with actual data fetching)
interface VoteData {
  voteName: string;
  candidates: { name: string; points: number }[];
  status: 'Open' | 'Closed' | 'Passed';
  voteUrl: string;
}

// Mock data fetching function
const fetchVoteData = async (voteId: string): Promise<VoteData | null> => {
  console.log(`Fetching data for vote: ${voteId}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // In a real app, fetch from your backend API
  // For now, return mock data based on the ID (example)
  if (voteId === "mock-vote-123") { // Example ID
    return {
      voteName: "Favorite Color Vote",
      candidates: [
        { name: 'Red', points: 35 },
        { name: 'Blue', points: 50 },
        { name: 'Green', points: 15 },
      ],
      status: 'Open',
      voteUrl: `${window.location.origin}/vote/${voteId}` // Generate voting page URL
    };
  }
  return null; // Vote not found
};

export default function VoteResultsPage() {
  const params = useParams();
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

// Dummy Button component if not already imported globally
// Usually you'd import this from '@/components/ui/button'
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  // Basic styling, replace with actual Shadcn Button if available
  const className = `px-4 py-2 rounded text-white ${props.disabled ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} ${props.className || ''}`;
  return <button {...props} className={className}>{children}</button>;
};
