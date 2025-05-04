## Gradual Reveal

This is a new featire for VoteViz Application.

I would like results to be displayed slowly over a period of time. This will add some drama and simulate a larger set of voters than have really participated.

It is important the actual results at the end represent excactly the correct voting points given to each candidate.

It would be good if there were some fun graphics to go with the stream of results.

## Implementation Plan

Based on the current Next.js application structure (`src/app`, `src/lib/memory-store`, `recharts` for charts), here's a plan to implement the Gradual Reveal feature primarily on the client-side Results page.

### 1. Configuration

*   Modify the vote creation process (in `src/app/page.tsx` or related component) to include options:
    *   Checkbox: "Enable Gradual Reveal".
    *   Input: "Reveal Duration (seconds)".
*   Update `VoteDetails` interface and `memory-store.ts` (`saveVoteDetails`, `getVoteDetails`) to store and retrieve these settings.
*   The `VoteResultsPage` would then read these settings to determine if/how to run the reveal.

### 2. Triggering the Reveal Sequence

*   Add a "Start Reveal" button to the Results page, visible only to the vote creator (`isCreator`) and only when `voteData.status === 'Closed'`. Clicking this button fetches the final results and starts the sequence. This provides more control over the timing.

### 3. Fetching Final Results

*   Once the reveal is triggered (by clicking the "Start Reveal" button), the `VoteResultsPage` component must make one final call to `fetchVoteData(voteId)` to get the definitive, complete results based on all submitted votes stored in `memory-store`.
*   This final, accurate data (e.g., `finalVoteData`) will be the target state for the reveal animation.

### 4. Client-Side Reveal Logic (`VoteResultsPage`)

*   **State Management:**
    *   Introduce new state variables, e.g., `isRevealing` (boolean), `displayedVoteData` (holds the results currently shown on the chart, starting at 0 points for all candidates).
    *   Keep the fetched `finalVoteData` separate.
*   **Animation Timer:**
    *   Use `useEffect` to start a timer (`setInterval` or recursive `setTimeout`) when `isRevealing` becomes true.
    *   The timer will run for a configurable duration (e.g., 30 seconds).
*   **Incremental Updates:**
    *   Inside the timer's callback:
        *   Calculate how many "simulated" points should be added in this step. This could be based on distributing the *difference* between `finalVoteData` and `displayedVoteData` over the remaining reveal time.
        *   **Add Drama:** Instead of smoothly incrementing all bars, simulate batches of votes. In each tick, randomly choose one or a few candidates and add a small, randomized chunk of points to their `displayedVoteData`, ensuring they don't exceed their total in `finalVoteData`.
        *   Update the `displayedVoteData` state, triggering a re-render of the chart.
*   **Completion:**
    *   When the timer finishes or `displayedVoteData` equals `finalVoteData`, clear the timer and set `isRevealing` to false. Ensure `displayedVoteData` exactly matches `finalVoteData`.
*   **UI Indicators:**
    *   While `isRevealing` is true, display a message like "Revealing Results..."
    *   Disable interactions like the "Close Vote" or "Start Reveal" button during the reveal.
    *   Show the final, static results clearly once the reveal is complete.

### 5. Visual Enhancements (Chart)

*   **Animation:** Leverage `recharts` animation capabilities if available, or integrate a library like `framer-motion` to smoothly animate the height changes of the bars in the `BarChart` as `displayedVoteData` updates.
*   **Highlights:** Temporarily highlight bars or show "+X" indicators when points are added to a candidate during the reveal.
*   **(Optional) Sound:** Add subtle sound effects when points are added or when the reveal completes.

### 6. Data Accuracy Guarantee

*   The final state of the reveal *must* exactly match the `finalVoteData` fetched after the vote closed. The client-side animation purely visualizes the transition to this known, correct end state. No calculations during the reveal should alter the final outcome.

### 7. Backend/API (`memory-store.ts`)

*   No changes are strictly necessary for the reveal logic itself, as it's client-driven based on the final results.
*   Ensure `getVoteResults` reliably returns the complete and accurate data for all users once the vote is closed.

