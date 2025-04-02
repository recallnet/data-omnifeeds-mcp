import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from 'dotenv';
import * as twitterClient from './twitter-client.js';
import * as substackClient from './substack-client.js';
import * as coingeckoClient from './coingecko-client.js';
// Load environment variables
dotenv.config();
/**
 * Converts HTML content to plain text while preserving basic structure
 * @param html HTML content to convert
 * @returns Plain text with preserved paragraph breaks
 */
function htmlToPlainText(html) {
    if (!html)
        return '';
    // Replace common block elements with newlines
    let text = html
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/figcaption>/gi, '\n[END CAPTION]\n'); // Mark end of captions for later processing
    // Mark image captions with special markers before removing tags
    text = text.replace(/<figcaption[^>]*>(.*?)<\/figcaption>/gi, '[CAPTION]$1[END CAPTION]');
    // Mark blockquotes for better formatting
    text = text.replace(/<blockquote[^>]*>/gi, '\n\n[QUOTE]\n');
    text = text.replace(/<\/blockquote>/gi, '\n[END QUOTE]\n\n');
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');
    // Process special markers
    text = text
        .replace(/\[CAPTION\](.*?)\[END CAPTION\]/gs, '[Image Caption: $1]')
        .replace(/\[QUOTE\](.*?)\[END QUOTE\]/gs, '> $1');
    // Decode HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    // Normalize whitespace
    text = text
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with just two
        .trim();
    return text;
}
/**
 * Extracts structured content from HTML, preserving important elements while removing heavy markup
 * @param html HTML content to process
 * @returns Simplified structured text with preserved important elements
 */
function extractStructuredContent(html) {
    if (!html)
        return '';
    // Convert HTML to plain text while preserving structure
    const plainText = htmlToPlainText(html);
    // Additional processing for simplified structured content
    // We could add more processing here if needed in the future
    return plainText;
}
/**
 * Processes a Substack post to convert HTML content to plain text
 * @param post Substack post object
 * @returns Post with HTML content converted to plain text
 */
function processPostContent(post) {
    if (!post)
        return post;
    const processedPost = { ...post };
    // Convert HTML content fields to plain text
    if (processedPost.body_html) {
        processedPost.body_text = htmlToPlainText(processedPost.body_html);
        delete processedPost.body_html;
    }
    if (processedPost.truncated_body_text) {
        processedPost.truncated_body_text = htmlToPlainText(processedPost.truncated_body_text);
    }
    return processedPost;
}
/**
 * Processes an array of Substack posts to convert HTML content to plain text
 * @param posts Array of Substack post objects
 * @returns Posts with HTML content converted to plain text
 */
function processPostsContent(posts) {
    if (!posts || !Array.isArray(posts))
        return posts;
    return posts.map(post => processPostContent(post));
}
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
// Add Substack tools based on available features
const substackFeatures = substackClient.getAvailableFeatures();
// Add Substack resource for available features
server.resource("substack-features", "substack://features", async (uri) => ({
    contents: [{
            uri: uri.href,
            text: JSON.stringify(substackFeatures, null, 2)
        }]
}));
// Add Substack tools if basic access is available
if (substackFeatures.basicAccess) {
    // Get only post slugs and titles (optimized for quick browsing)
    server.tool("substack-get-post-slugs", "Gets a lightweight list of recent posts with only basic info (slug, title, date). Best for browsing publications quickly.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        limit: z.number().min(1).max(50).default(3).describe("Number of posts to retrieve (max 50)")
    }, async ({ substackId, limit }) => {
        const posts = await substackClient.getRecentPosts(substackId, limit);
        const slugsAndTitles = posts.map(post => ({
            slug: post.slug,
            title: post.title,
            post_date: post.post_date
        }));
        return {
            content: [{
                    type: "text",
                    text: slugsAndTitles.length > 0 ? JSON.stringify(slugsAndTitles, null, 2) : "No posts found"
                }]
        };
    });
    // Get recent posts
    server.tool("substack-get-recent-posts", "Retrieves recent posts from a Substack publication. Returns minimal metadata by default, or full content when fullData=true.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        limit: z.number().min(1).max(50).default(3).describe("Number of posts to retrieve (max 50)"),
        fullData: z.boolean().default(false).describe("Whether to return full post data or just basic information")
    }, async ({ substackId, limit, fullData }) => {
        const posts = await substackClient.getRecentPosts(substackId, limit);
        let result;
        if (fullData) {
            // Return full data with processed HTML content
            result = processPostsContent(posts);
        }
        else {
            // Return minimal data
            result = posts.map(post => ({
                id: post.id,
                title: post.title,
                subtitle: post.subtitle || "",
                slug: post.slug,
                post_date: post.post_date,
                type: post.type,
                wordcount: post.wordcount,
                reaction_count: post.reaction_count,
                comment_count: post.comment_count,
                audience: post.audience
            }));
        }
        return {
            content: [{
                    type: "text",
                    text: result.length > 0 ? JSON.stringify(result, null, 2) : "No posts found"
                }]
        };
    });
    // Get posts with offset
    server.tool("substack-get-posts", "Gets posts from a Substack publication with pagination support. Use offset to navigate through older posts.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        limit: z.number().min(1).max(50).default(3).describe("Number of posts to retrieve (max 50)"),
        offset: z.number().min(0).default(0).describe("Offset for pagination"),
        fullData: z.boolean().default(false).describe("Whether to return full post data or just basic information")
    }, async ({ substackId, limit, offset, fullData }) => {
        const posts = await substackClient.getPosts(substackId, limit, offset);
        let result;
        if (fullData) {
            // Return full data with processed HTML content
            result = processPostsContent(posts);
        }
        else {
            // Return minimal data
            result = posts.map(post => ({
                id: post.id,
                title: post.title,
                subtitle: post.subtitle || "",
                slug: post.slug,
                post_date: post.post_date,
                type: post.type,
                wordcount: post.wordcount,
                reaction_count: post.reaction_count,
                comment_count: post.comment_count,
                audience: post.audience
            }));
        }
        return {
            content: [{
                    type: "text",
                    text: result.length > 0 ? JSON.stringify(result, null, 2) : "No posts found"
                }]
        };
    });
    // Get post by slug
    server.tool("substack-get-post-by-slug", "Retrieves a specific post by its slug identifier. Use fullData=true to get complete content.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        slug: z.string().describe("Slug of the post to retrieve"),
        fullData: z.boolean().default(false).describe("Whether to return full post data or just basic information")
    }, async ({ substackId, slug, fullData }) => {
        const post = await substackClient.getPostBySlug(substackId, slug);
        if (!post) {
            return {
                content: [{
                        type: "text",
                        text: "Post not found"
                    }]
            };
        }
        if (!fullData) {
            // Return minimal post data
            const minimalPost = {
                id: post.id,
                title: post.title,
                subtitle: post.subtitle || "",
                slug: post.slug,
                post_date: post.post_date,
                type: post.type,
                wordcount: post.wordcount,
                reaction_count: post.reaction_count,
                comment_count: post.comment_count,
                audience: post.audience
            };
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify(minimalPost, null, 2)
                    }]
            };
        }
        // Process and return full post data
        const processedPost = processPostContent(post);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(processedPost, null, 2)
                }]
        };
    });
    // Get post content by URL (new tool)
    server.tool("substack-get-post-content", "Fetches full content of a post given its complete URL. Returns full article content.", {
        postUrl: z.string().describe("Full URL of the Substack post (e.g., https://example.substack.com/p/post-slug)")
    }, async ({ postUrl }) => {
        try {
            const postContent = await substackClient.getPostContent(postUrl);
            // Convert HTML content to plain text
            if (postContent.contentHtml) {
                postContent.contentText = htmlToPlainText(postContent.contentHtml);
                delete postContent.contentHtml;
            }
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify(postContent, null, 2)
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: `Error fetching post content: ${error instanceof Error ? error.message : String(error)}`
                    }]
            };
        }
    });
    // Get latest post with full content (combined endpoint)
    server.tool("substack-get-latest-post-content", "Retrieves the most recent post from a publication. Set fullData=true to get complete content.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        fullData: z.boolean().default(false).describe("Whether to return full post content or just basic information"),
        simplifiedText: z.boolean().default(false).describe("When true, returns simplified text content instead of HTML (only applies when fullData=true)")
    }, async ({ substackId, fullData, simplifiedText }) => {
        try {
            const posts = await substackClient.getRecentPosts(substackId, 1);
            if (posts.length === 0) {
                return {
                    content: [{
                            type: "text",
                            text: "No posts found for this publication"
                        }]
                };
            }
            const latestPost = posts[0];
            if (!fullData) {
                // Return minimal post data
                const minimalPost = {
                    id: latestPost.id,
                    title: latestPost.title,
                    subtitle: latestPost.subtitle || "",
                    slug: latestPost.slug,
                    post_date: latestPost.post_date,
                    type: latestPost.type,
                    wordcount: latestPost.wordcount,
                    reaction_count: latestPost.reaction_count,
                    comment_count: latestPost.comment_count,
                    audience: latestPost.audience
                };
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify(minimalPost, null, 2)
                        }]
                };
            }
            // If fullData is true, get the complete content
            const normalizedId = substackId.includes('.') ? substackId : `${substackId}.substack.com`;
            const postUrl = `https://${normalizedId}/p/${latestPost.slug}`;
            const postContent = await substackClient.getPostContent(postUrl);
            // Process the content based on user preference
            if (simplifiedText) {
                // Extract clean, structured text without heavy HTML
                if (postContent.contentHtml) {
                    postContent.contentText = extractStructuredContent(postContent.contentHtml);
                    delete postContent.contentHtml; // Remove HTML to save bandwidth
                }
            }
            else if (postContent.contentHtml) {
                // Default behavior: Convert HTML to plain text
                postContent.contentText = htmlToPlainText(postContent.contentHtml);
                delete postContent.contentHtml;
            }
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify(postContent, null, 2)
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: `Error fetching latest post content: ${error instanceof Error ? error.message : String(error)}`
                    }]
            };
        }
    });
    // Get comments for a post
    server.tool("substack-get-comments", "Retrieves comments for a specific post.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        postId: z.string().describe("ID of the post to get comments for")
    }, async ({ substackId, postId }) => {
        const comments = await substackClient.getComments(substackId, postId);
        return {
            content: [{
                    type: "text",
                    text: comments.length > 0 ? JSON.stringify(comments, null, 2) : "No comments found"
                }]
        };
    });
    // Search posts
    server.tool("substack-search-posts", "Searches for posts containing the specified term. Returns matching posts with metadata.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        searchTerm: z.string().describe("Term to search for in posts"),
        limit: z.number().min(1).max(50).default(3).describe("Maximum number of results to return (max 50)")
    }, async ({ substackId, searchTerm, limit }) => {
        const posts = await substackClient.searchPosts(substackId, searchTerm, limit);
        return {
            content: [{
                    type: "text",
                    text: posts.length > 0 ? JSON.stringify(posts, null, 2) : "No matching posts found"
                }]
        };
    });
    // Get publication info
    server.tool("substack-get-publication-info", "Gets information about a Substack publication including description, stats, and metadata.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)")
    }, async ({ substackId }) => {
        const info = await substackClient.getPublicationInfo(substackId);
        return {
            content: [{
                    type: "text",
                    text: info ? JSON.stringify(info, null, 2) : "Publication information not found"
                }]
        };
    });
    // List Substack categories
    server.tool("substack-list-categories", "Lists all available Substack content categories.", {}, async () => {
        const categories = await substackClient.listCategories();
        return {
            content: [{
                    type: "text",
                    text: categories.length > 0 ? JSON.stringify(categories, null, 2) : "No categories found"
                }]
        };
    });
    // Get newsletters in a category
    server.tool("substack-get-category-newsletters", "Gets list of newsletters in a specific category.", {
        categoryId: z.number().describe("Category ID to get newsletters for"),
        page: z.number().min(0).default(0).describe("Page number for pagination"),
        limit: z.number().min(1).max(50).default(3).describe("Number of newsletters to retrieve (max 50)")
    }, async ({ categoryId, page, limit }) => {
        const newsletters = await substackClient.getCategoryNewsletters(categoryId, page, limit);
        return {
            content: [{
                    type: "text",
                    text: newsletters.length > 0 ? JSON.stringify(newsletters, null, 2) : "No newsletters found in this category"
                }]
        };
    });
    // Get user profile
    server.tool("substack-get-user-profile", "Gets public profile information for a Substack user.", {
        username: z.string().describe("Substack username to get profile information for")
    }, async ({ username }) => {
        const profile = await substackClient.getUserProfile(username);
        return {
            content: [{
                    type: "text",
                    text: profile ? JSON.stringify(profile, null, 2) : "User profile not found"
                }]
        };
    });
    // Get network authors
    server.tool("substack-get-newsletter-authors", "Gets the authors of a Substack publication.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)")
    }, async ({ substackId }) => {
        const authors = await substackClient.getNewsletterAuthors(substackId);
        return {
            content: [{
                    type: "text",
                    text: authors.length > 0 ? JSON.stringify(authors, null, 2) : "No authors found"
                }]
        };
    });
    // Get latest post with simplified text content (optimized for readability)
    server.tool("substack-get-latest-post-simplified", "Retrieves the most recent post from a publication in simplified text format without HTML markup.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        includeMetadata: z.boolean().default(true).describe("Whether to include post metadata along with content")
    }, async ({ substackId, includeMetadata }) => {
        try {
            const posts = await substackClient.getRecentPosts(substackId, 1);
            if (posts.length === 0) {
                return {
                    content: [{
                            type: "text",
                            text: "No posts found for this publication"
                        }]
                };
            }
            const latestPost = posts[0];
            const normalizedId = substackId.includes('.') ? substackId : `${substackId}.substack.com`;
            const postUrl = `https://${normalizedId}/p/${latestPost.slug}`;
            const postContent = await substackClient.getPostContent(postUrl);
            let simplifiedContent = '';
            if (postContent.contentHtml) {
                simplifiedContent = extractStructuredContent(postContent.contentHtml);
            }
            if (includeMetadata) {
                const response = {
                    title: postContent.title,
                    author: postContent.author,
                    publish_date: postContent.publish_date,
                    canonical_url: postContent.canonical_url,
                    content: simplifiedContent
                };
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify(response, null, 2)
                        }]
                };
            }
            else {
                // Return just the content without any JSON wrapping
                return {
                    content: [{
                            type: "text",
                            text: simplifiedContent
                        }]
                };
            }
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: `Error fetching latest post content: ${error instanceof Error ? error.message : String(error)}`
                    }]
            };
        }
    });
    // Get network recommendations
    server.tool("substack-get-newsletter-recommendations", "Gets recommended newsletters for a specific publication.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)")
    }, async ({ substackId }) => {
        const recommendations = await substackClient.getNewsletterRecommendations(substackId);
        return {
            content: [{
                    type: "text",
                    text: recommendations.length > 0 ? JSON.stringify(recommendations, null, 2) : "No recommendations found"
                }]
        };
    });
    // Find post and get content (combined function)
    server.tool("substack-search-and-get-content", "Searches for posts by term and returns the first match. Use fullData=true to get complete content.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        searchTerm: z.string().describe("Term to search for in posts"),
        fullData: z.boolean().default(false).describe("Whether to return full post content or just basic information")
    }, async ({ substackId, searchTerm, fullData }) => {
        try {
            // First search for posts matching the search term
            const posts = await substackClient.searchPosts(substackId, searchTerm, 1);
            if (posts.length === 0) {
                return {
                    content: [{
                            type: "text",
                            text: "No posts found matching the search term"
                        }]
                };
            }
            // Get the first matching post
            const post = posts[0];
            if (!fullData) {
                // Return minimal post data
                const minimalPost = {
                    id: post.id,
                    title: post.title,
                    subtitle: post.subtitle || "",
                    slug: post.slug,
                    post_date: post.post_date,
                    type: post.type,
                    wordcount: post.wordcount,
                    reaction_count: post.reaction_count,
                    comment_count: post.comment_count,
                    audience: post.audience
                };
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify(minimalPost, null, 2)
                        }]
                };
            }
            // If fullData is true, get the complete content
            const normalizedId = substackId.includes('.') ? substackId : `${substackId}.substack.com`;
            const postUrl = `https://${normalizedId}/p/${post.slug}`;
            // Get the full content
            const postContent = await substackClient.getPostContent(postUrl);
            // Convert HTML content to plain text
            if (postContent.contentHtml) {
                postContent.contentText = htmlToPlainText(postContent.contentHtml);
                delete postContent.contentHtml;
            }
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify(postContent, null, 2)
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: `Error searching for and getting post content: ${error instanceof Error ? error.message : String(error)}`
                    }]
            };
        }
    });
    // Get post summaries only (optimized for listing)
    server.tool("substack-get-post-summaries", "Gets lightweight summaries of posts (without full content) - optimized for efficient browsing.", {
        substackId: z.string().describe("Substack publication ID (subdomain or custom domain)"),
        limit: z.number().min(1).max(50).default(3).describe("Number of posts to retrieve (max 50)")
    }, async ({ substackId, limit }) => {
        const posts = await substackClient.getRecentPosts(substackId, limit);
        const summaries = posts.map(post => ({
            id: post.id,
            title: post.title,
            subtitle: post.subtitle,
            slug: post.slug,
            post_date: post.post_date,
            wordcount: post.wordcount,
            type: post.type,
            reaction_count: post.reaction_count,
            comment_count: post.comment_count
        }));
        return {
            content: [{
                    type: "text",
                    text: summaries.length > 0 ? JSON.stringify(summaries, null, 2) : "No posts found"
                }]
        };
    });
}
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
    server.tool("twitter-get-profile", "Gets public profile information for a Twitter user.", {
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
    server.tool("twitter-get-tweets", "Gets recent tweets from a specific user (doesn't include replies).", {
        username: z.string().describe("Twitter username to get tweets from"),
        count: z.number().min(1).max(100).default(3).describe("Number of tweets to retrieve (max 100)")
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
    server.tool("twitter-get-tweets-and-replies", "Gets recent tweets and replies from a specific user (includes conversations).", {
        username: z.string().describe("Twitter username to get tweets and replies from"),
        count: z.number().min(1).max(100).default(3).describe("Number of tweets to retrieve (max 100)")
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
    server.tool("twitter-get-latest-tweet", "Gets only the most recent tweet from a user (optionally include retweets).", {
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
    server.tool("twitter-get-tweet", "Gets a single tweet by its ID.", {
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
    server.tool("twitter-get-quoted-tweets", "Gets tweets that quote (retweet with comment) a specific tweet.", {
        tweetId: z.string().describe("ID of the tweet to get quotes of"),
        count: z.number().min(1).max(100).default(3).describe("Maximum number of quoted tweets to retrieve")
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
    server.tool("twitter-get-retweeters", "Gets users who retweeted a specific tweet.", {
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
    server.tool("twitter-get-list-tweets", "Gets tweets from a Twitter list (curated collection of users).", {
        listId: z.string().describe("ID of the Twitter list to get tweets from"),
        count: z.number().min(1).max(100).default(3).describe("Number of tweets to retrieve (max 100)")
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
    server.tool("twitter-get-trends", "Gets current trending topics on Twitter.", {}, async () => {
        const trends = await twitterClient.getTrends();
        return {
            content: [{
                    type: "text",
                    text: trends.length > 0 ? JSON.stringify(trends, null, 2) : "No trends found"
                }]
        };
    });
    // Search tweets
    server.tool("twitter-search-tweets", "Searches for tweets containing specific keywords or matching search criteria.", {
        query: z.string().describe("Search query"),
        count: z.number().min(1).max(100).default(3).describe("Number of tweets to retrieve (max 100)")
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
    server.tool("twitter-search-profiles", "Searches for Twitter user profiles matching the search query.", {
        query: z.string().describe("Search query"),
        count: z.number().min(1).max(100).default(3).describe("Number of profiles to retrieve (max 100)")
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
    server.tool("twitter-get-user-id", "Converts a Twitter username to its numeric user ID.", {
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
    server.tool("twitter-get-username", "Converts a Twitter user ID to its username (screen name).", {
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
    server.tool("twitter-get-followers", "Gets users who follow a specific Twitter user.", {
        userId: z.string().describe("Twitter user ID to get followers for"),
        count: z.number().min(1).max(100).default(3).describe("Number of followers to retrieve (max 100)")
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
    server.tool("twitter-get-following", "Gets users that a specific Twitter user follows.", {
        userId: z.string().describe("Twitter user ID to get following for"),
        count: z.number().min(1).max(100).default(3).describe("Number of following to retrieve (max 100)")
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
    server.tool("twitter-get-article", "Gets an article published via Twitter.", {
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
    server.tool("twitter-send-tweet", "Posts a new tweet to the authenticated user's account.", {
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
    server.tool("twitter-like-tweet", "Likes a tweet as the authenticated user.", {
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
    server.tool("twitter-retweet", "Retweets a tweet as the authenticated user.", {
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
    server.tool("twitter-follow-user", "Follows a user as the authenticated user.", {
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
    server.tool("twitter-get-home-timeline", "Gets the home timeline for the authenticated user.", {
        count: z.number().min(1).max(100).default(3).describe("Number of tweets to retrieve (max 100)"),
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
    server.tool("twitter-get-following-timeline", "Gets tweets from accounts the authenticated user follows.", {
        count: z.number().min(1).max(100).default(3).describe("Number of tweets to retrieve (max 100)"),
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
// Add CoinGecko tools based on available features
const coingeckoFeatures = coingeckoClient.getAvailableFeatures();
// Add CoinGecko resource for available features
server.resource("coingecko-features", "coingecko://features", async (uri) => ({
    contents: [{
            uri: uri.href,
            text: JSON.stringify(coingeckoFeatures, null, 2)
        }]
}));
// Add CoinGecko tools if API access is available
if (coingeckoFeatures.apiAccess) {
    // Get features
    server.tool("coingecko-get-features", "Gets available CoinGecko API features and capabilities.", async () => {
        const features = await coingeckoClient.getAvailableFeatures();
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(features, null, 2)
                }]
        };
    });
    // Get token price
    server.tool("coingecko-get-price", "Gets current price of a cryptocurrency token in specified currency.", {
        tokenId: z.string().describe("The CoinGecko token ID (e.g., 'bitcoin')"),
        currency: z.string().default("usd").describe("The currency to get the price in (e.g., 'usd')")
    }, async ({ tokenId, currency }) => {
        const price = await coingeckoClient.getTokenPrice(tokenId, currency);
        return {
            content: [{
                    type: "text",
                    text: price ? JSON.stringify(price, null, 2) : "Price not found"
                }]
        };
    });
    // Get token contracts
    server.tool("coingecko-get-contracts", "Gets blockchain contract addresses for a token across different chains.", {
        tokenId: z.string().describe("The CoinGecko token ID (e.g., 'usd-coin')")
    }, async ({ tokenId }) => {
        const contracts = await coingeckoClient.getTokenContracts(tokenId);
        return {
            content: [{
                    type: "text",
                    text: contracts ? JSON.stringify(contracts, null, 2) : "Contracts not found"
                }]
        };
    });
    // Search tokens
    server.tool("coingecko-search", "Searches for cryptocurrency tokens by name or symbol.", {
        query: z.string().describe("The search query"),
        limit: z.number().min(1).max(100).default(3).describe("Maximum number of results (default: 3, max: 100)")
    }, async ({ query, limit }) => {
        const results = await coingeckoClient.searchTokens(query, limit);
        return {
            content: [{
                    type: "text",
                    text: results.length > 0 ? JSON.stringify(results, null, 2) : "No results found"
                }]
        };
    });
    // Get trending tokens
    server.tool("coingecko-trending", "Gets currently trending tokens in the cryptocurrency market.", {
        limit: z.number().min(1).max(10).default(3).describe("Maximum number of results (default: 3)")
    }, async ({ limit }) => {
        const results = await coingeckoClient.getTrendingTokens(limit);
        return {
            content: [{
                    type: "text",
                    text: results.length > 0 ? JSON.stringify(results, null, 2) : "No trending tokens found"
                }]
        };
    });
}
// Start the server using stdio transport
async function main() {
    // Redirect console.log to console.error for debugging
    // This prevents log messages from interfering with the MCP protocol
    const originalConsoleLog = console.log;
    console.log = function (...args) {
        console.error(...args);
    };
    console.error("Starting data-skills-server...");
    // Log available Twitter features
    console.error("Available Twitter features:", twitterFeatures);
    // Log available Substack features
    console.error("Available Substack features:", substackFeatures);
    // Log available CoinGecko features
    console.error("Available CoinGecko features:", coingeckoFeatures);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Server connected!");
}
main().catch(error => {
    console.error("Error starting server:", error);
    process.exit(1);
});
