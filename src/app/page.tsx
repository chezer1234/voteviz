'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const FormSchema = z.object({
  voteName: z.string().min(2, {
    message: "Vote name must be at least 2 characters.",
  }),
  candidates: z.array(z.string()).min(2, {
    message: "You must add at least 2 candidates.",
  }),
  maxVoters: z.number().optional(),
  pointsToCarry: z.number().optional(),
  votingEndDate: z.date().optional(),
});

export default function Home() {
  const [candidates, setCandidates] = useState<string[]>([]);
  const router = useRouter();
  const [voteId, setVoteId] = useState<string | null>(null);
  const { toast } = useToast(); // Use the useToast hook

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      voteName: "",
      candidates: [],
      maxVoters: undefined,
      pointsToCarry: undefined,
      votingEndDate: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      // Here you would typically save the vote data to a database
      // and generate a unique ID for the vote.
      // For this example, we'll just generate a random ID.
      const newVoteId = Math.random().toString(36).substring(2, 15);
      setVoteId(newVoteId);

      // Simulate saving to a backend (replace with your actual API call)
      await saveVoteData(newVoteId, values);

      // After saving, navigate to the results page.
      // Assuming you have a route like /vote/[voteId]/results
      // where [voteId] is the unique ID of the vote.
      console.log("Form values:", values);
      router.push(`/vote/${newVoteId}/results`);
    } catch (error) {
      console.error("Error saving vote data:", error);
      toast({
        title: "Error publishing vote",
        description: "There was an error saving the vote. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Simulate saving to a backend
  const saveVoteData = (voteId: string, values: z.infer<typeof FormSchema>) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // In a real application, you would save to a database here
        console.log("Saving vote data to backend:", voteId, values);
        resolve(true);
      }, 500); // Simulate network delay
    });
  };

  const addCandidate = (candidateName: string) => {
    if (candidateName && !candidates.includes(candidateName)) {
      setCandidates([...candidates, candidateName]);
      form.setValue("candidates", [...candidates, candidateName]);
    }
  };

  const removeCandidate = (candidateName: string) => {
    const updatedCandidates = candidates.filter((candidate) => candidate !== candidateName);
    setCandidates(updatedCandidates);
    form.setValue("candidates", updatedCandidates);
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="voteName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vote Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vote name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is the name that will be displayed for the vote.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-2">
                <Label htmlFor="candidates">Candidates</Label>
                <div className="flex gap-2">
                  <Input
                    id="newCandidate"
                    placeholder="Add candidate"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCandidate(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
                <FormDescription>
                  Add candidates for this vote. Press enter to add.
                </FormDescription>
                <div className="flex flex-wrap gap-2">
                  {candidates.map((candidate) => (
                    <Button
                      key={candidate}
                      variant="secondary"
                      size="sm"
                      onClick={() => removeCandidate(candidate)}
                    >
                      {candidate} <span className="ml-1">x</span>
                    </Button>
                  ))}
                </div>
                {form.formState.errors.candidates && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.candidates?.message}
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="maxVoters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Number of Voters (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter maximum number of voters"
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Limit the maximum number of unique voters allowed for this
                      vote.
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
                    <FormLabel>
                      Number of Candidate Voting Points to Carry the Motion
                      (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter points to carry"
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      The minimum number of points a candidate needs to carry the
                      motion.
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
                            variant={"outline"}
                            className={
                              "w-[240px] pl-3 text-left font-normal" +
                              (field.value ? " !text-foreground" : " text-muted-foreground")
                            }
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabledDate={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      The date and time when voting will automatically close.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">Publish Vote</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      {voteId && (
        <p>
          Vote published! Go to <a href={`/vote/${voteId}/results`}>Results Page</a>
        </p>
      )}
      </div>
  );
}
