'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { cn } from "@/lib/utils"; // Assuming you have a cn utility
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge"; // Import Badge for candidates

// Define the schema based on blueprint requirements
const FormSchema = z.object({
  voteName: z.string().min(2, { message: "Vote name must be at least 2 characters." }),
  candidates: z.array(z.string().min(1, { message: "Candidate names cannot be empty." }))
                 .min(2, { message: "You must add at least 2 candidates." }),
  // Optional fields from blueprint
  maxVoters: z.coerce.number().positive("Maximum voters must be a positive number.").optional(), // Use coerce for number conversion
  pointsToCarry: z.coerce.number().positive("Points to carry must be a positive number.").optional(),
  votingEndDate: z.date().optional(),
});

type VoteFormData = z.infer<typeof FormSchema>;

// In-memory store for vote details and results (replace with actual backend)
let voteDetailsStore: { [voteId: string]: VoteFormData } = {};

// Mock function to simulate saving vote data to a backend
const publishVote = async (values: VoteFormData): Promise<{ success: boolean; voteId: string | null; error?: string }> => {
  console.log("Publishing vote with data:", values);
  // Simulate network delay & ID generation
  await new Promise(resolve => setTimeout(resolve, 600));

  // --- Replace with actual backend API call ---
  const success = Math.random() > 0.1; // Simulate 90% success rate
  if (success) {
    // Generate a fixed VoteId for testing purposes
    const newVoteId = "mock-vote-123"; // Fixed vote ID
	voteDetailsStore[newVoteId] = values; // Save vote details

    console.log("Vote published successfully with ID:", newVoteId);
    return { success: true, voteId: newVoteId };
  } else {
    console.error("Failed to publish vote (simulated error)");
    return { success: false, voteId: null, error: "Failed to save vote to the server (simulated)." };
  }
  // --- End of backend simulation ---
};

export default function CreateVotePage() {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateInput, setCandidateInput] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<VoteFormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      voteName: "",
      candidates: [], // Initialize candidates array in form state
      maxVoters: undefined,
      pointsToCarry: undefined,
      votingEndDate: undefined,
    },
  });

  const handleAddCandidate = () => {
    const trimmedInput = candidateInput.trim();
    if (trimmedInput && !candidates.includes(trimmedInput)) {
      const newCandidates = [...candidates, trimmedInput];
      setCandidates(newCandidates);
      form.setValue("candidates", newCandidates, { shouldValidate: true }); // Update form state & validate
      setCandidateInput(""); // Clear input
    } else if (candidates.includes(trimmedInput)) {
       toast({ title: "Candidate already added", variant: "destructive" });
    } else {
         toast({ title: "Candidate name cannot be empty", variant: "destructive" });
    }
  };

  const handleRemoveCandidate = (candidateToRemove: string) => {
    const newCandidates = candidates.filter(c => c !== candidateToRemove);
    setCandidates(newCandidates);
    form.setValue("candidates", newCandidates, { shouldValidate: true }); // Update form state & validate
  };

  const onSubmit = async (values: VoteFormData) => {
    // The 'candidates' field is already managed by the form state
    console.log("Form submitted with values:", values);

    try {
      const result = await publishVote(values);

      if (result.success && result.voteId) {
        toast({
          title: "Vote Published Successfully!",
          description: `Vote ID: ${result.voteId}`,
        });
        // Redirect to the results page as per blueprint
        router.push(`/vote/${result.voteId}/results`);
      } else {
        toast({
          title: "Error Publishing Vote",
          description: result.error || "An unknown error occurred.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error during vote publication process:", error);
      toast({
        title: "Error Publishing Vote",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create New Vote</CardTitle>
          <CardDescription>
            Define the parameters for your new vote.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Vote Name */}
              <FormField
                control={form.control}
                name="voteName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vote Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vote name (e.g., Team Mascot)" {...field} />
                    </FormControl>
                    <FormDescription>
                      The public name for this vote.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Candidates */}
              <FormField
                control={form.control} // Control this field for validation reporting
                name="candidates"
                render={() => ( // We manage state separately, but hook into the form field for errors
                  <FormItem>
                    <FormLabel>Candidates *</FormLabel>
                    <FormDescription>
                      Add at least two candidates. Each voter can distribute 100 points.
                    </FormDescription>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add candidate name"
                        value={candidateInput}
                        onChange={(e) => setCandidateInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCandidate();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddCandidate} variant="outline">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[2.5rem] items-center p-2 border rounded">
                      {candidates.length === 0 ? (
                         <span className="text-sm text-muted-foreground">No candidates added yet.</span>
                      ) : candidates.map((candidate) => (
                         <Badge key={candidate} variant="secondary" className="flex items-center gap-1">
                           {candidate}
                           <button
                             type="button"
                             onClick={() => handleRemoveCandidate(candidate)}
                             className="ml-1 text-muted-foreground hover:text-destructive">
                             &times;
                           </button>
                         </Badge>
                      ))}
                    </div>
                    <FormMessage /> {/* Shows validation errors for the candidates array */}
                  </FormItem>
                )}
              />

              {/* Optional Fields */}
              <FormField
                control={form.control}
                name="maxVoters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Voters (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 50"
                        {...field}
                        value={field.value ?? ""} // Handle undefined for input value
                        onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} // Convert to number or undefined
                      />
                    </FormControl>
                    <FormDescription>
                      Limit the number of unique voters allowed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pointsToCarry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points to Carry Motion (Optional)</FormLabel>
                    <FormControl>
                       <Input
                        type="number"
                        placeholder="e.g., 200"
                        {...field}
                         value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} // Convert to number or undefined
                      />
                    </FormControl>
                    <FormDescription>
                      The minimum total points required for the vote to be considered "passed".
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="votingEndDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Voting End Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      If set, voting will automatically close on this date.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Publishing..." : "Publish Vote"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
