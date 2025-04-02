/**
 * Declaration file for agent-twitter-client
 * This uses 'any' typing to prevent TypeScript errors while maintaining runtime functionality
 */
declare module 'agent-twitter-client' {
  export class Scraper {
    constructor(options?: any);

    // Methods from error messages
    login(username?: string, password?: string, email?: string): Promise<any>;
    isLoggedIn(): Promise<boolean>;
    getProfileInfo(username: string): Promise<any>;
    getProfile(username: string): Promise<any>;
    getTweets(username: string, count?: number): Promise<any[]>;
    getPostById(postId: string): Promise<any>;
    searchTweets(query: string, count?: number, mode?: any): Promise<any[]>;
    searchUsers(query: string, options?: any): Promise<any>;
    getTrends(): Promise<any[]>;
    sendTweet(text: string): Promise<any>;
    likeTweet(tweetId: string): Promise<any>;
    retweet(tweetId: string): Promise<any>;
    grokChat(options: { messages: any[] }): Promise<any>;
    searchProfiles(query: string, count?: number): Promise<any[]>;
    getUserIdByScreenName(screenName: string): Promise<string>;
    getScreenNameByUserId(userId: string): Promise<string>;
    getFollowers(userId: string, count?: number): Promise<any[]>;
    getFollowing(userId: string, count?: number): Promise<any[]>;
    fetchHomeTimeline(count?: number, seenTweetIds?: string[]): Promise<any[]>;
    fetchFollowingTimeline(count?: number, seenTweetIds?: string[]): Promise<any[]>;
    getTweetsAndReplies(username: string, count?: number): Promise<any[]>;
    getTweetsByUserId(userId: string, count?: number): Promise<any[]>;
    getLatestTweet(username: string, includeRetweets?: boolean): Promise<any>;
    getTweet(tweetId: string): Promise<any>;
    followUser(username: string): Promise<any>;
    getDirectMessageConversations(userId?: string, cursor?: string): Promise<any>;
    sendDirectMessage(conversationId: string, text: string): Promise<any>;
    getArticle(articleId: string): Promise<any>;
    getAllQuotedTweets(tweetId: string, maxTweetsPerPage?: number): Promise<any[]>;
    getRetweetersOfTweet(tweetId: string): Promise<any[]>;
    fetchListTweets(listId: string, count?: number): Promise<{ tweets: any[] } | any[]>;
  }

  export enum SearchMode {
    Latest,
    Trending,
    Photos,
    Videos,
    People
  }

  // Add any other exports as needed
  export const TIMELINE_TYPE: any;
}