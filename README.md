# VoteChain
A multi-user, proportional voting application.

The state of each vote must be kept at the server.

## Home Page
The home page allows a new “Vote” to be created with a name and the following options:
- Add candidates
    - Description: “each vote can allocate up to 100 points across all the candidates”
    - Add a candidate (multiple, nice control).
    - One or more of the following options:
       - Maximum number of unique voters allowed.
       - Number of candidate voting points to carry the motion.
       - Date / time when voting closes.
       - Manual Vote Close Button.

Add a publish button which will create a generated unique vote pages for “place votes” and viewing results. A link to the “vote results" page is displayed.

## Voting Results Page
A QR code for reaching the “place vote” page is shown.

The bar chart of the live results recorded by the server so far is shown. The bar chart will refresh as new candidates are proposed.

A display of when the vote is open / closed / passed i.e. carried.

## Voting Page
Any unique visitor (identified by unique device initially) will be able to cast their vote once only.

Before the vote is open, additional candidates can be proposed.

Horizontal bar sliders that can distribute points (up to 100 across all candidates). Each sliders should:
Show the points allocated for that candidate
Not be able to be increased unless the total is below 100

A place vote button (available when voting is open AND the votes total 100.
