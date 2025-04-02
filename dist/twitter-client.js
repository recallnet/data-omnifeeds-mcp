import { Scraper, SearchMode } from 'agent-twitter-client';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Define the required environment variables for different Twitter functionalities
const CREDENTIALS = {
    basic: ['TWITTER_USERNAME', 'TWITTER_PASSWORD'],
    email: ['TWITTER_EMAIL'],
    api: ['TWITTER_APP_KEY', 'TWITTER_APP_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET']
};
// Check if a set of environment variables are available
function checkEnvVars(vars) {
    return vars.every(variable => !!process.env[variable] && process.env[variable].trim() !== '');
}
// Check which Twitter functionalities are available based on environment variables
export function getAvailableFeatures() {
    const features = {
        basicAuth: checkEnvVars(CREDENTIALS.basic),
        emailAuth: checkEnvVars(CREDENTIALS.email),
        apiAuth: checkEnvVars(CREDENTIALS.api),
        fullAuth: checkEnvVars([...CREDENTIALS.basic, ...CREDENTIALS.email]),
        grokAccess: checkEnvVars([...CREDENTIALS.basic, ...CREDENTIALS.email]) // Grok requires full authentication
    };
    // Ensure valid JSON by stringifying and parsing
    try {
        // This will throw an error if the object can't be properly serialized
        JSON.parse(JSON.stringify(features));
        return features;
    }
    catch (error) {
        console.error('Error formatting features as JSON:', error);
        // Return a safe fallback
        return {
            basicAuth: false,
            emailAuth: false,
            apiAuth: false,
            fullAuth: false,
            grokAccess: false
        };
    }
}
// Create and initialize a Twitter scraper instance
export async function createTwitterClient() {
    const features = getAvailableFeatures();
    if (!features.basicAuth) {
        console.warn('Twitter client not initialized: Missing basic authentication credentials');
        return null;
    }
    try {
        const scraper = new Scraper();
        // Initialize with credentials if available
        if (features.apiAuth) {
            console.log('Initializing Twitter client with API credentials');
            // Note: setApiCredentials might not be available in the current version
            // This is a fallback in case the API changes
            const scraperAny = scraper;
            if (typeof scraperAny.setApiCredentials === 'function') {
                scraperAny.setApiCredentials(process.env.TWITTER_APP_KEY, process.env.TWITTER_APP_SECRET, process.env.TWITTER_ACCESS_TOKEN, process.env.TWITTER_ACCESS_SECRET);
            }
        }
        // Login if credentials are available
        if (features.basicAuth) {
            console.log('Logging in to Twitter...');
            await scraper.login(process.env.TWITTER_USERNAME, process.env.TWITTER_PASSWORD, features.emailAuth ? process.env.TWITTER_EMAIL : undefined);
            const isLoggedIn = await scraper.isLoggedIn();
            if (isLoggedIn) {
                console.log('Successfully logged in to Twitter');
            }
            else {
                console.error('Failed to log in to Twitter');
                return null;
            }
        }
        return scraper;
    }
    catch (error) {
        console.error('Error initializing Twitter client:', error);
        return null;
    }
}
// Helper function to safely execute Twitter API calls
export async function safeTwitterCall(callback, defaultValue) {
    try {
        const scraper = await createTwitterClient();
        if (!scraper) {
            return defaultValue;
        }
        const result = await callback(scraper);
        return result;
    }
    catch (error) {
        console.error('Error executing Twitter API call:', error);
        return defaultValue;
    }
}
// Export Twitter functionality as individual functions
export async function getTweets(username, count = 10) {
    return safeTwitterCall(async (scraper) => {
        const tweets = await scraper.getTweets(username, count);
        // Convert AsyncGenerator to array
        const result = [];
        for await (const tweet of tweets) {
            result.push(tweet);
        }
        return result;
    }, []);
}
export async function getProfile(username) {
    return safeTwitterCall(async (scraper) => await scraper.getProfile(username), null);
}
export async function getTrends() {
    return safeTwitterCall(async (scraper) => await scraper.getTrends(), []);
}
export async function searchTweets(query, count = 20, mode = SearchMode.Latest) {
    return safeTwitterCall(async (scraper) => {
        const tweets = await scraper.searchTweets(query, count, mode);
        // Convert AsyncGenerator to array
        const result = [];
        for await (const tweet of tweets) {
            result.push(tweet);
        }
        return result;
    }, []);
}
export async function sendTweet(text) {
    return safeTwitterCall(async (scraper) => await scraper.sendTweet(text), null);
}
export async function likeTweet(tweetId) {
    return safeTwitterCall(async (scraper) => await scraper.likeTweet(tweetId), null);
}
export async function retweet(tweetId) {
    return safeTwitterCall(async (scraper) => await scraper.retweet(tweetId), null);
}
export async function grokChat(messages) {
    return safeTwitterCall(async (scraper) => {
        const features = getAvailableFeatures();
        if (!features.grokAccess) {
            throw new Error('Grok access requires full Twitter authentication');
        }
        // Convert messages to the correct format
        const grokMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        return await scraper.grokChat({ messages: grokMessages });
    }, {
        conversationId: '',
        message: 'Grok access not available',
        messages: []
    });
}
// Search for Twitter profiles
export async function searchProfiles(query, count = 10) {
    return safeTwitterCall(async (scraper) => {
        const profiles = await scraper.searchProfiles(query, count);
        // Convert AsyncGenerator to array
        const result = [];
        for await (const profile of profiles) {
            result.push(profile);
        }
        return result;
    }, []);
}
// Get user ID by screen name
export async function getUserIdByScreenName(screenName) {
    return safeTwitterCall(async (scraper) => await scraper.getUserIdByScreenName(screenName), '');
}
// Get screen name by user ID
export async function getScreenNameByUserId(userId) {
    return safeTwitterCall(async (scraper) => await scraper.getScreenNameByUserId(userId), '');
}
// Get followers of a user
export async function getFollowers(userId, count = 20) {
    return safeTwitterCall(async (scraper) => {
        const followers = await scraper.getFollowers(userId, count);
        // Convert AsyncGenerator to array
        const result = [];
        for await (const follower of followers) {
            result.push(follower);
        }
        return result;
    }, []);
}
// Get users that a user is following
export async function getFollowing(userId, count = 20) {
    return safeTwitterCall(async (scraper) => {
        const following = await scraper.getFollowing(userId, count);
        // Convert AsyncGenerator to array
        const result = [];
        for await (const user of following) {
            result.push(user);
        }
        return result;
    }, []);
}
// Fetch home timeline
export async function fetchHomeTimeline(count = 20, seenTweetIds = []) {
    return safeTwitterCall(async (scraper) => await scraper.fetchHomeTimeline(count, seenTweetIds), []);
}
// Fetch following timeline
export async function fetchFollowingTimeline(count = 20, seenTweetIds = []) {
    return safeTwitterCall(async (scraper) => await scraper.fetchFollowingTimeline(count, seenTweetIds), []);
}
// Get tweets and replies from a user
export async function getTweetsAndReplies(username, count = 20) {
    return safeTwitterCall(async (scraper) => {
        const tweets = await scraper.getTweetsAndReplies(username, count);
        // Convert AsyncGenerator to array
        const result = [];
        for await (const tweet of tweets) {
            result.push(tweet);
        }
        return result;
    }, []);
}
// Get tweets by user ID
export async function getTweetsByUserId(userId, count = 20) {
    return safeTwitterCall(async (scraper) => {
        const tweets = await scraper.getTweetsByUserId(userId, count);
        // Convert AsyncGenerator to array
        const result = [];
        for await (const tweet of tweets) {
            result.push(tweet);
        }
        return result;
    }, []);
}
// Get latest tweet from a user
export async function getLatestTweet(username, includeRetweets = false) {
    return safeTwitterCall(async (scraper) => await scraper.getLatestTweet(username, includeRetweets), null);
}
// Get a specific tweet by ID
export async function getTweet(tweetId) {
    return safeTwitterCall(async (scraper) => await scraper.getTweet(tweetId), null);
}
// Follow a user
export async function followUser(username) {
    return safeTwitterCall(async (scraper) => {
        await scraper.followUser(username);
        return true;
    }, false);
}
// Get direct message conversations
export async function getDirectMessageConversations(userId, cursor) {
    return safeTwitterCall(async (scraper) => await scraper.getDirectMessageConversations(userId, cursor), { conversations: [], users: [], userId: '' });
}
// Send a direct message
export async function sendDirectMessage(conversationId, text) {
    return safeTwitterCall(async (scraper) => await scraper.sendDirectMessage(conversationId, text), { entries: [], users: {} });
}
// Get an article (long-form tweet)
export async function getArticle(articleId) {
    return safeTwitterCall(async (scraper) => await scraper.getArticle(articleId), null);
}
// Get all quoted tweets of a tweet
export async function getAllQuotedTweets(tweetId, maxTweetsPerPage = 20) {
    return safeTwitterCall(async (scraper) => await scraper.getAllQuotedTweets(tweetId, maxTweetsPerPage), []);
}
// Get all retweeters of a tweet
export async function getRetweetersOfTweet(tweetId) {
    return safeTwitterCall(async (scraper) => await scraper.getRetweetersOfTweet(tweetId), []);
}
// Get tweets from a list
export async function getListTweets(listId, count = 50) {
    return safeTwitterCall(async (scraper) => {
        try {
            const tweets = await scraper.fetchListTweets(listId, count);
            // Convert to array if needed to ensure we have a length property
            if (tweets && Array.isArray(tweets)) {
                return tweets;
            }
            else if (tweets && tweets.tweets && Array.isArray(tweets.tweets)) {
                return tweets.tweets;
            }
            else {
                // If we can't determine the structure, return an empty array
                console.error('Unexpected response format from fetchListTweets');
                return [];
            }
        }
        catch (error) {
            console.error('Error fetching list tweets:', error);
            return [];
        }
    }, []);
}
