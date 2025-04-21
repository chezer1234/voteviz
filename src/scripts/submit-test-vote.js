// Script to simulate submitting a vote from a different device
import { saveVoteResults } from '../lib/memory-store.js';

const VOTE_ID = 'vote-1745253145793-20'; // The vote ID from the example
const USER_ID = 'simulated-test-device-' + Date.now(); // Create a unique user ID
const TEST_VOTE = {
  'a': 50,  // Different distribution than the first vote
  '\\b': 30,
  'v': 20
};

async function submitTestVote() {
  console.log(`Submitting test vote for ${VOTE_ID} from user ${USER_ID}`);
  console.log('Vote data:', TEST_VOTE);
  
  try {
    await saveVoteResults(VOTE_ID, USER_ID, TEST_VOTE);
    console.log('Test vote submitted successfully');
  } catch (error) {
    console.error('Error submitting test vote:', error);
  }
}

// Run the function
submitTestVote(); 