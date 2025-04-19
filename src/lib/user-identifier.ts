const USER_ID_KEY = 'voteviz-user-id';

/**
 * Retrieves a unique user identifier.
 * - On the server or if window is undefined, returns 'server-side-user'.
 * - If running on localhost and a `testUser` query parameter is present, uses that.
 * - Otherwise, retrieves from localStorage, generating and storing a new one if needed.
 * @returns {string} The unique user identifier.
 */
export function getUserIdentifier(): string {
    if (typeof window === 'undefined') {
        return 'server-side-user'; 
    }

    // Check for testUser query parameter only on localhost for testing
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const urlParams = new URLSearchParams(window.location.search);
        const testUserId = urlParams.get('testUser');
        if (testUserId) {
            console.log('Using testUser query parameter:', testUserId);
            return testUserId;
        }
    }

    // Default to localStorage
    let userId = localStorage.getItem(USER_ID_KEY);

    if (!userId) {
        userId = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        localStorage.setItem(USER_ID_KEY, userId);
        console.log('Generated and stored new user identifier:', userId);
    } else {
        // console.log('Retrieved existing user identifier:', userId);
    }

    return userId;
} 