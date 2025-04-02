import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import * as dotenv from 'dotenv';
import * as twitterClient from './twitter-client.js';
// Load environment variables
dotenv.config();
// Create a new MCP server
const server = new McpServer({
    name: "data-skills-server",
    version: "1.0.0"
});
// Add a simple static resource
server.resource("documentation", "docs://overview", async (uri) => ({
    contents: [{
            uri: uri.href,
            text: "# Data Skills Server\n\nThis server provides various data analysis capabilities through MCP."
        }]
}));
// Add a parameterized resource
server.resource("dataset-info", new ResourceTemplate("dataset://{datasetName}", { list: undefined }), async (uri, { datasetName }) => ({
    contents: [{
            uri: uri.href,
            text: `Information about dataset: ${datasetName}\n\nThis is a placeholder for actual dataset metadata.`
        }]
}));
// Add a simple calculation tool
server.tool("calculate-statistics", {
    numbers: z.array(z.number()),
    operation: z.enum(["mean", "median", "sum", "min", "max"])
}, async ({ numbers, operation }) => {
    let result;
    switch (operation) {
        case "mean":
            result = numbers.reduce((a, b) => a + b, 0) / numbers.length;
            break;
        case "median":
            const sorted = [...numbers].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            result = sorted.length % 2 === 0
                ? (sorted[mid - 1] + sorted[mid]) / 2
                : sorted[mid];
            break;
        case "sum":
            result = numbers.reduce((a, b) => a + b, 0);
            break;
        case "min":
            result = Math.min(...numbers);
            break;
        case "max":
            result = Math.max(...numbers);
            break;
    }
    return {
        content: [{
                type: "text",
                text: `The ${operation} of [${numbers.join(", ")}] is ${result}`
            }]
    };
});
// Add a data analysis prompt
server.prompt("analyze-data", {
    dataset: z.string(),
    question: z.string()
}, ({ dataset, question }) => ({
    messages: [{
            role: "user",
            content: {
                type: "text",
                text: `I want to analyze the dataset "${dataset}" to answer the following question: ${question}`
            }
        }]
}));
// Add Twitter tools based on available environment variables
const twitterFeatures = twitterClient.getAvailableFeatures();
// Add Twitter resource for available features
server.resource("twitter-features", "twitter://features", async (uri) => ({
    contents: [{
            uri: uri.href,
            text: JSON.stringify(twitterFeatures, null, 2)
        }]
}));
// Add Twitter tools if basic authentication is available
if (twitterFeatures.basicAuth) {
    // Get user profile
    server.tool("twitter-get-profile", {
        username: z.string().describe("Twitter username to get profile information for")
    }, async ({ username }) => {
        const profile = await twitterClient.getProfile(username);
        return {
            content: [{
                    type: "text",
                    text: profile ? JSON.stringify(profile, null, 2) : "Profile not found"
                }]
        };
    });
    // Get tweets
    server.tool("twitter-get-tweets", {
        username: z.string().describe("Twitter username to get tweets from"),
        count: z.number().min(1).max(100).default(10).describe("Number of tweets to retrieve (max 100)")
    }, async ({ username, count }) => {
        const tweets = await twitterClient.getTweets(username, count);
        return {
            content: [{
                    type: "text",
                    text: tweets.length > 0 ? JSON.stringify(tweets, null, 2) : "No tweets found"
                }]
        };
    });
    // Get tweets and replies
    server.tool("twitter-get-tweets-and-replies", {
        username: z.string().describe("Twitter username to get tweets and replies from"),
        count: z.number().min(1).max(100).default(10).describe("Number of tweets to retrieve (max 100)")
    }, async ({ username, count }) => {
        const tweets = await twitterClient.getTweetsAndReplies(username, count);
        return {
            content: [{
                    type: "text",
                    text: tweets.length > 0 ? JSON.stringify(tweets, null, 2) : "No tweets found"
                }]
        };
    });
    // Get latest tweet
    server.tool("twitter-get-latest-tweet", {
        username: z.string().describe("Twitter username to get the latest tweet from"),
        includeRetweets: z.boolean().default(false).describe("Whether to include retweets")
    }, async ({ username, includeRetweets }) => {
        const tweet = await twitterClient.getLatestTweet(username, includeRetweets);
        return {
            content: [{
                    type: "text",
                    text: tweet ? JSON.stringify(tweet, null, 2) : "No tweet found"
                }]
        };
    });
    // Get specific tweet
    server.tool("twitter-get-tweet", {
        tweetId: z.string().describe("ID of the tweet to retrieve")
    }, async ({ tweetId }) => {
        const tweet = await twitterClient.getTweet(tweetId);
        return {
            content: [{
                    type: "text",
                    text: tweet ? JSON.stringify(tweet, null, 2) : "Tweet not found"
                }]
        };
    });
    // Get quoted tweets
    server.tool("twitter-get-quoted-tweets", {
        tweetId: z.string().describe("ID of the tweet to get quotes of"),
        count: z.number().min(1).max(100).default(20).describe("Maximum number of quoted tweets to retrieve")
    }, async ({ tweetId, count }) => {
        const tweets = await twitterClient.getAllQuotedTweets(tweetId, count);
        return {
            content: [{
                    type: "text",
                    text: tweets.length > 0 ? JSON.stringify(tweets, null, 2) : "No quoted tweets found"
                }]
        };
    });
    // Get retweeters
    server.tool("twitter-get-retweeters", {
        tweetId: z.string().describe("ID of the tweet to get retweeters for")
    }, async ({ tweetId }) => {
        const retweeters = await twitterClient.getRetweetersOfTweet(tweetId);
        return {
            content: [{
                    type: "text",
                    text: retweeters.length > 0 ? JSON.stringify(retweeters, null, 2) : "No retweeters found"
                }]
        };
    });
    // Get tweets from a list
    server.tool("twitter-get-list-tweets", {
        listId: z.string().describe("ID of the Twitter list to get tweets from"),
        count: z.number().min(1).max(100).default(50).describe("Number of tweets to retrieve (max 100)")
    }, async ({ listId, count }) => {
        const tweets = await twitterClient.getListTweets(listId, count);
        return {
            content: [{
                    type: "text",
                    text: tweets.length > 0 ? JSON.stringify(tweets, null, 2) : "No tweets found in list"
                }]
        };
    });
    // Get trends
    server.tool("twitter-get-trends", {}, async () => {
        const trends = await twitterClient.getTrends();
        return {
            content: [{
                    type: "text",
                    text: trends.length > 0 ? JSON.stringify(trends, null, 2) : "No trends found"
                }]
        };
    });
    // Search tweets
    server.tool("twitter-search-tweets", {
        query: z.string().describe("Search query"),
        count: z.number().min(1).max(100).default(20).describe("Number of tweets to retrieve (max 100)")
    }, async ({ query, count }) => {
        const tweets = await twitterClient.searchTweets(query, count);
        return {
            content: [{
                    type: "text",
                    text: tweets.length > 0 ? JSON.stringify(tweets, null, 2) : "No tweets found"
                }]
        };
    });
    // Search profiles
    server.tool("twitter-search-profiles", {
        query: z.string().describe("Search query"),
        count: z.number().min(1).max(100).default(10).describe("Number of profiles to retrieve (max 100)")
    }, async ({ query, count }) => {
        const profiles = await twitterClient.searchProfiles(query, count);
        return {
            content: [{
                    type: "text",
                    text: profiles.length > 0 ? JSON.stringify(profiles, null, 2) : "No profiles found"
                }]
        };
    });
    // Get user ID by screen name
    server.tool("twitter-get-user-id", {
        username: z.string().describe("Twitter username to get ID for")
    }, async ({ username }) => {
        const userId = await twitterClient.getUserIdByScreenName(username);
        return {
            content: [{
                    type: "text",
                    text: userId ? userId : "User ID not found"
                }]
        };
    });
    // Get screen name by user ID
    server.tool("twitter-get-username", {
        userId: z.string().describe("Twitter user ID to get username for")
    }, async ({ userId }) => {
        const username = await twitterClient.getScreenNameByUserId(userId);
        return {
            content: [{
                    type: "text",
                    text: username ? username : "Username not found"
                }]
        };
    });
    // Get followers
    server.tool("twitter-get-followers", {
        userId: z.string().describe("Twitter user ID to get followers for"),
        count: z.number().min(1).max(100).default(20).describe("Number of followers to retrieve (max 100)")
    }, async ({ userId, count }) => {
        const followers = await twitterClient.getFollowers(userId, count);
        return {
            content: [{
                    type: "text",
                    text: followers.length > 0 ? JSON.stringify(followers, null, 2) : "No followers found"
                }]
        };
    });
    // Get following
    server.tool("twitter-get-following", {
        userId: z.string().describe("Twitter user ID to get following for"),
        count: z.number().min(1).max(100).default(20).describe("Number of following to retrieve (max 100)")
    }, async ({ userId, count }) => {
        const following = await twitterClient.getFollowing(userId, count);
        return {
            content: [{
                    type: "text",
                    text: following.length > 0 ? JSON.stringify(following, null, 2) : "No following found"
                }]
        };
    });
    // Get article
    server.tool("twitter-get-article", {
        articleId: z.string().describe("ID of the article to retrieve")
    }, async ({ articleId }) => {
        const article = await twitterClient.getArticle(articleId);
        return {
            content: [{
                    type: "text",
                    text: article ? JSON.stringify(article, null, 2) : "Article not found"
                }]
        };
    });
}
// Add Twitter write tools if full authentication is available
if (twitterFeatures.fullAuth) {
    // Send tweet
    server.tool("twitter-send-tweet", {
        text: z.string().max(280).describe("Tweet text (max 280 characters)")
    }, async ({ text }) => {
        const result = await twitterClient.sendTweet(text);
        return {
            content: [{
                    type: "text",
                    text: result ? "Tweet sent successfully" : "Failed to send tweet"
                }]
        };
    });
    // Like tweet
    server.tool("twitter-like-tweet", {
        tweetId: z.string().describe("ID of the tweet to like")
    }, async ({ tweetId }) => {
        const result = await twitterClient.likeTweet(tweetId);
        return {
            content: [{
                    type: "text",
                    text: result ? "Tweet liked successfully" : "Failed to like tweet"
                }]
        };
    });
    // Retweet
    server.tool("twitter-retweet", {
        tweetId: z.string().describe("ID of the tweet to retweet")
    }, async ({ tweetId }) => {
        const result = await twitterClient.retweet(tweetId);
        return {
            content: [{
                    type: "text",
                    text: result ? "Retweeted successfully" : "Failed to retweet"
                }]
        };
    });
    // Follow user
    server.tool("twitter-follow-user", {
        username: z.string().describe("Username of the user to follow")
    }, async ({ username }) => {
        const result = await twitterClient.followUser(username);
        return {
            content: [{
                    type: "text",
                    text: result ? "User followed successfully" : "Failed to follow user"
                }]
        };
    });
    // Get home timeline
    server.tool("twitter-get-home-timeline", {
        count: z.number().min(1).max(100).default(20).describe("Number of tweets to retrieve (max 100)"),
        seenTweetIds: z.array(z.string()).optional().describe("IDs of tweets already seen")
    }, async ({ count, seenTweetIds = [] }) => {
        const timeline = await twitterClient.fetchHomeTimeline(count, seenTweetIds);
        return {
            content: [{
                    type: "text",
                    text: timeline.length > 0 ? JSON.stringify(timeline, null, 2) : "No tweets found"
                }]
        };
    });
    // Get following timeline
    server.tool("twitter-get-following-timeline", {
        count: z.number().min(1).max(100).default(20).describe("Number of tweets to retrieve (max 100)"),
        seenTweetIds: z.array(z.string()).optional().describe("IDs of tweets already seen")
    }, async ({ count, seenTweetIds = [] }) => {
        const timeline = await twitterClient.fetchFollowingTimeline(count, seenTweetIds);
        return {
            content: [{
                    type: "text",
                    text: timeline.length > 0 ? JSON.stringify(timeline, null, 2) : "No tweets found"
                }]
        };
    });
    // Get direct message conversations
    server.tool("twitter-get-dm-conversations", {
        userId: z.string().describe("User ID to get conversations for")
    }, async ({ userId }) => {
        const conversations = await twitterClient.getDirectMessageConversations(userId);
        return {
            content: [{
                    type: "text",
                    text: conversations && conversations.conversations && conversations.conversations.length > 0
                        ? JSON.stringify(conversations, null, 2)
                        : "No conversations found"
                }]
        };
    });
    // Send direct message
    server.tool("twitter-send-dm", {
        conversationId: z.string().describe("ID of the conversation to send the message to"),
        text: z.string().describe("Text of the message to send")
    }, async ({ conversationId, text }) => {
        const result = await twitterClient.sendDirectMessage(conversationId, text);
        return {
            content: [{
                    type: "text",
                    text: result ? "Message sent successfully" : "Failed to send message"
                }]
        };
    });
}
// Add Grok chat tool if Grok access is available
if (twitterFeatures.grokAccess) {
    server.tool("twitter-grok-chat", {
        message: z.string().describe("Message to send to Grok"),
        history: z.array(z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string()
        })).optional().describe("Optional conversation history")
    }, async ({ message, history = [] }) => {
        // Prepare messages for Grok
        const messages = [
            ...history,
            { role: "user", content: message }
        ];
        const result = await twitterClient.grokChat(messages);
        return {
            content: [{
                    type: "text",
                    text: result.message || "No response from Grok"
                }]
        };
    });
}
// Create an Express app for HTTP transport
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
// Store active transports
const activeTransports = new Map();
// SSE endpoint
app.get("/sse", async (req, res) => {
    const sessionId = Math.random().toString(36).substring(2, 15);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const transport = new SSEServerTransport("/messages", res);
    activeTransports.set(sessionId, transport);
    // Set up cleanup when client disconnects
    req.on("close", () => {
        activeTransports.delete(sessionId);
        console.error(`Client disconnected: ${sessionId}`);
    });
    res.write(`data: ${JSON.stringify({ sessionId })}\n\n`);
    try {
        await server.connect(transport);
        console.error(`Client connected: ${sessionId}`);
    }
    catch (error) {
        console.error(`Error connecting client ${sessionId}:`, error);
    }
});
// Message endpoint
app.post("/messages", express.json(), async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId || !activeTransports.has(sessionId)) {
        res.status(404).json({ error: "Session not found" });
        return;
    }
    const transport = activeTransports.get(sessionId);
    try {
        await transport.handlePostMessage(req, res);
    }
    catch (error) {
        console.error(`Error handling message for session ${sessionId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Start the HTTP server with port fallback
function startServer(port, maxRetries = 3, retryCount = 0) {
    const server = app.listen(port)
        .on('error', (err) => {
        if (err.code === 'EADDRINUSE' && retryCount < maxRetries) {
            console.error(`Port ${port} is already in use, trying port ${port + 1}...`);
            server.close();
            startServer(port + 1, maxRetries, retryCount + 1);
        }
        else {
            console.error(`Failed to start server: ${err.message}`);
        }
    })
        .on('listening', () => {
        const actualPort = server.address().port;
        console.error(`HTTP server listening on port ${actualPort}`);
        console.error(`SSE endpoint: http://localhost:${actualPort}/sse`);
        console.error(`Messages endpoint: http://localhost:${actualPort}/messages?sessionId=<SESSION_ID>`);
        console.error("Available Twitter features:", twitterFeatures);
    });
}
startServer(PORT);
