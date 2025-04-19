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
import { saveVoteDetails } from '@/lib/memory-store';
import { getUserIdentifier } from '@/lib/user-identifier'; // Import the user identifier function
import { ThemeToggle } from "@/components/ui/theme-toggle";

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


// Function to generate a unique vote ID
const generateVoteId = (): string => {
  return `vote-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// Mock function to simulate saving vote data to a backend
const publishVote = async (values: VoteFormData): Promise<{ success: boolean; voteId: string | null; error?: string }> => {
  console.log("Publishing vote with data:", values);
  // Simulate network delay & ID generation
  await new Promise(resolve => setTimeout(resolve, 600));

  try {
    const newVoteId = generateVoteId(); // Generate a unique VoteId
    const creatorToken = getUserIdentifier(); // Get the creator's unique token
    console.log(`Generated newVoteId: ${newVoteId}, CreatorToken: ${creatorToken}`); 
    // *** Use the centralized memory store ***
    await saveVoteDetails(newVoteId, values, creatorToken); // Pass the creator token
    console.log("Vote published successfully with ID:", newVoteId);
    return { success: true, voteId: newVoteId };
  } catch (error) {
    console.error("Failed to publish vote (simulated error)", error);
    // If saveVoteDetails could potentially throw errors, add specific catch here
    return { success: false, voteId: null, error: "Failed to save vote to the server (simulated)." };
  }
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
      form.setValue("candidates", newCandidates, { shouldValidate: true, shouldDirty: true }); // Validate on add
      setCandidateInput("");
    } else if (candidates.includes(trimmedInput)) {
      toast({ title: "Candidate already added", variant: "destructive" });
    } else {
      toast({ title: "Candidate name cannot be empty", variant: "destructive" });
    }
  };

  const handleRemoveCandidate = (candidateToRemove: string) => {
    const newCandidates = candidates.filter(c => c !== candidateToRemove);
    setCandidates(newCandidates);
    form.setValue("candidates", newCandidates, { shouldValidate: true, shouldDirty: true }); // Validate on remove
  };

  const onSubmit = async (values: VoteFormData) => {
    // Ensure candidates array is updated before submission
    // (Though setValue should handle this, double-check if issues arise)
    console.log("Form submitted with values:", values);

    // Trigger validation manually to be sure errors are shown if needed
    const isValid = await form.trigger();
    if (!isValid) {
      toast({ title: "Please fix the errors in the form.", variant: "destructive" });
      return; // Stop submission if validation fails
    }

    try {
      const result = await publishVote(values);
      if (result.success && result.voteId) {
        // Don't store voteName in localStorage, it should be fetched on the results page
        toast({
          title: "Vote Published Successfully!",
          description: `Your vote is ready. ID: ${result.voteId}`,
        });
        router.push(`/vote/${result.voteId}/results`);
      } else {
        toast({
          title: "Error Publishing Vote",
          description: result.error || "An unknown server error occurred.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error during vote publication process:", error);
      toast({
        title: "Network Error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-gradient-to-br from-background to-muted/50 p-6 sm:p-12">
    <ThemeToggle />
      <Card className="w-full max-w-3xl shadow-lg border border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">Create New Vote</CardTitle>
          <CardDescription className="text-muted-foreground">
            Set up your proportional vote poll.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="voteName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold">Vote Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Favorite Ice Cream Flavor"
                        {...field}
                        className="transition-colors focus:ring-primary focus:border-primary"
                      />
                    </FormControl>
                    <FormDescription>
                      Give your vote a clear and descriptive name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="candidates"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold">Candidates *</FormLabel>
                    <FormDescription>
                      Add at least two options for voters to allocate points to.
                    </FormDescription>
                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
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
                        className="flex-grow transition-colors focus:ring-primary focus:border-primary"
                      />
                      <Button
                        type="button"
                        onClick={handleAddCandidate}
                        variant="secondary"
                        className="transition-colors whitespace-nowrap"
                      >
                        Add Candidate
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[3rem] items-center p-3 border rounded-md bg-muted/30">
                      {candidates.length === 0 ? (
                         <span className="text-sm text-muted-foreground italic px-1">No candidates added yet.</span>
                      ) : candidates.map((candidate) => (
                         <Badge key={candidate} variant="outline" className="flex items-center gap-1.5 py-1 px-2.5 border-accent bg-accent/50 text-accent-foreground transition-colors">
                           <span className="font-medium">{candidate}</span>
                           <button
                             type="button"
                             aria-label={`Remove ${candidate}`}
                             onClick={() => handleRemoveCandidate(candidate)}
                             className="ml-1 text-muted-foreground rounded-full p-0.5 transition-colors hover:bg-destructive/20 hover:text-destructive">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                           </button>
                         </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-6 pt-4 border-t border-border/50">
                <h3 className="text-lg font-semibold text-muted-foreground">Optional Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="maxVoters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Voters</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="e.g., 50 (Unlimited if blank)"
                            {...field}
                            value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            className="transition-colors focus:ring-primary focus:border-primary"
                          />
                        </FormControl>
                        <FormDescription>
                          Limit the total number of voters.
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
                        <FormLabel>Points Per Voter</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Default: 100"
                            {...field}
                            value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            className="transition-colors focus:ring-primary focus:border-primary"
                          />
                        </FormControl>
                        <FormDescription>
                          Points each voter can distribute.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="votingEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Voting End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal transition-colors focus:ring-primary focus:border-primary",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date (Optional)</span>}
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
                        Set an optional deadline for voting.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-border/50">
                <Button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 text-lg font-semibold transition-colors bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Publishing..." : "Publish Vote"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
