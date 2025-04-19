'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from 'react';

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

  function onSubmit(values: z.infer<typeof FormSchema>) {
    console.log(values);
  }

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
                        {...field}
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
                        {...field}
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
      </div>
  );
}

