# **App Name**: VoteViz

## Core Features:

- Vote Creation: Create a new vote with options for candidates, maximum voters, points to carry, and voting period.
- Page Generation: Generate unique vote pages for casting votes and viewing results.
- Results Display: Display a QR code and live bar chart of voting results, updating as votes are cast.
- Vote Casting: Allow unique visitors to allocate 100 points across candidates using horizontal bar sliders.
- Candidate Recommendation: AI tool that determines if a new proposed candidate is similar to existing candidates, based on a similarity score.

## Style Guidelines:

- Primary color: Neutral white or light gray for a clean background.
- Secondary color: A calming blue (#3498db) to represent trust and stability.
- Accent: Green (#2ecc71) for indicating a successful vote or carried motion.
- Use a grid-based layout to ensure a clear and organized presentation of candidates and voting options.
- Use simple, clear icons to represent different voting options and statuses.
- Subtle animations to indicate changes in vote counts or status updates.

## Original User Request:
# VoteChain
We want to create a multi-user, proportional voting application. The state of each vote must be kept at the server.

## Home Page
The home page allows a new “Vote” to be created with a name and the following options:

1. Add candidates
    Description: “each vote can allocate up to 100 points across all the candidates”
    Add a candidate (multiple, nice control).
2. One or more of the following options:
    a. Maximum number of unique voters allowed.
    b. Number of candidate voting points to carry the motion.
    c. Date / time when voting closes.
    d. Manual Vote Close Button.

Add a publish button which will create a generated unique vote pages for “place votes” and viewing results. A link to the “vote results" page is displayed.

## Voting Results Page
A QR code for reaching the “place vote” page is shown.

The bar chart of the live results recorded by the server so far is shown. The bar chart will refresh as new candidates are proposed.

A display of when the vote is open / closed / passed i.e. carried.

## Voting Page
Any unique visitor (identified by unique device initially) will be able to cast their vote once only.

Before the vote is open, additional candidates can be proposed.

Horizontal bar sliders that can distribute points (up to 100 across all candidates). Each sliders should:
- Show the points allocated for that candidate
- Not be able to be increased unless the total is below 100

A place vote button (available when voting is open AND the votes total 100.
  