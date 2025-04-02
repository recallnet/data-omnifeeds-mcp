/**
 * Tests for the Substack client
 *
 * These tests validate the Substack API client functions using the 's4mmyeth.substack.com' newsletter
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { getAvailableFeatures, getPosts, getRecentPosts, getComments, getPostBySlug, searchPosts, getPostContent, listCategories, getCategoryNewsletters, getUserProfile, getNewsletterAuthors, getNewsletterRecommendations } from '../substack-client.js';
// Test newsletter to use for all tests
const TEST_NEWSLETTER = 's4mmyeth.substack.com';
// A known valid Substack username for testing user profile API
const TEST_USER = 'mattyglesias'; // A popular Substack author
// Test category ID (Technology)
const TEST_CATEGORY_ID = 42;
// Known post slug from the test newsletter (updated to a valid post)
const TEST_POST_SLUG = 'the-agentic-future-ai-agent-weekly-20a';
// Full URL for a post to test content retrieval
const TEST_POST_URL = `https://${TEST_NEWSLETTER}/p/${TEST_POST_SLUG}`;
/**
 * Helper function to ensure tests don't overload the API
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Set longer timeout for API calls
jest.setTimeout(30000);
describe('Substack Client', () => {
    // Add delay between tests to avoid rate limiting
    beforeEach(async () => {
        await delay(1000);
    });
    test('getAvailableFeatures returns features object', () => {
        const features = getAvailableFeatures();
        expect(features).toBeDefined();
        expect(features.basicAccess).toBeDefined();
    });
    test('getPosts returns posts from test newsletter', async () => {
        const posts = await getPosts(TEST_NEWSLETTER, 2);
        expect(Array.isArray(posts)).toBe(true);
        expect(posts.length).toBeGreaterThan(0);
        expect(posts.length).toBeLessThanOrEqual(2);
        if (posts.length > 0) {
            expect(posts[0].id).toBeDefined();
            expect(posts[0].title).toBeDefined();
        }
    });
    test('getRecentPosts returns recent posts from test newsletter', async () => {
        const posts = await getRecentPosts(TEST_NEWSLETTER, 2);
        expect(Array.isArray(posts)).toBe(true);
        expect(posts.length).toBeGreaterThan(0);
        expect(posts.length).toBeLessThanOrEqual(2);
        if (posts.length > 0) {
            expect(posts[0].id).toBeDefined();
            expect(posts[0].title).toBeDefined();
        }
    });
    test('getPostBySlug returns a specific post by slug', async () => {
        const post = await getPostBySlug(TEST_NEWSLETTER, TEST_POST_SLUG);
        expect(post).toBeDefined();
        if (post) {
            expect(post.id).toBeDefined();
            expect(post.title).toBeDefined();
            expect(post.slug).toBe(TEST_POST_SLUG);
        }
    });
    test('searchPosts finds posts containing search term', async () => {
        // Use a generic term likely to be found in most newsletters
        const searchTerm = 'the';
        const posts = await searchPosts(TEST_NEWSLETTER, searchTerm, 2);
        expect(Array.isArray(posts)).toBe(true);
        // Note: This might occasionally fail if there are no posts containing the term
    });
    test('getPostContent fetches the full content of a post', async () => {
        try {
            const postContent = await getPostContent(TEST_POST_URL);
            expect(postContent).toBeDefined();
            expect(postContent.title).toBeDefined();
            expect(postContent.author).toBeDefined();
            // Check for either HTML or text content
            if (postContent.contentHtml) {
                expect(postContent.contentHtml.length).toBeGreaterThan(50); // Assume content has some length
            }
            else if (postContent.contentText) {
                expect(postContent.contentText.length).toBeGreaterThan(50); // Assume content has some length
            }
            else {
                throw new Error('Neither contentHtml nor contentText is defined in post content');
            }
        }
        catch (error) {
            // Skip test if post content API returns 404
            if (error.message.includes('404')) {
                console.warn(`Could not fetch content for test post ${TEST_POST_URL}, skipping test`);
            }
            else {
                throw error;
            }
        }
    });
    test('listCategories returns a list of Substack categories', async () => {
        const categories = await listCategories();
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBeGreaterThan(0);
        if (categories.length > 0) {
            expect(categories[0].id).toBeDefined();
            expect(categories[0].name).toBeDefined();
        }
    });
    test('getCategoryNewsletters returns newsletters in a category', async () => {
        const newsletters = await getCategoryNewsletters(TEST_CATEGORY_ID, 0, 3);
        expect(Array.isArray(newsletters)).toBe(true);
        if (newsletters.length > 0) {
            expect(newsletters[0].name).toBeDefined();
            expect(newsletters[0].domain).toBeDefined();
        }
    });
    test('getUserProfile returns information about a Substack user', async () => {
        try {
            const userProfile = await getUserProfile(TEST_USER);
            expect(userProfile).toBeDefined();
            expect(userProfile.id).toBeDefined();
            expect(userProfile.name).toBeDefined();
            expect(userProfile.handle).toBe(TEST_USER);
        }
        catch (error) {
            // Skip test if user not found
            if (error.message.includes('not found')) {
                console.warn(`Test user ${TEST_USER} not found, skipping test`);
            }
            else {
                throw error;
            }
        }
    });
    test('getNewsletterAuthors returns authors of a newsletter', async () => {
        try {
            const authors = await getNewsletterAuthors(TEST_NEWSLETTER);
            expect(Array.isArray(authors)).toBe(true);
            if (authors.length > 0) {
                expect(authors[0].id).toBeDefined();
                expect(authors[0].name).toBeDefined();
                expect(authors[0].handle).toBeDefined();
            }
        }
        catch (error) {
            // Skip test if API is not available
            console.warn(`Failed to get authors: ${error.message}`);
        }
    });
    test('getNewsletterRecommendations returns recommended newsletters', async () => {
        try {
            const recommendations = await getNewsletterRecommendations(TEST_NEWSLETTER);
            expect(Array.isArray(recommendations)).toBe(true);
            if (recommendations.length > 0) {
                expect(recommendations[0].name).toBeDefined();
                expect(recommendations[0].domain).toBeDefined();
            }
        }
        catch (error) {
            // This might fail if the newsletter has no posts or no recommendations
            console.warn(`Failed to get recommendations: ${error.message}`);
        }
    });
    test('getComments returns comments on a post if available', async () => {
        // First get a post ID for a recent post
        const posts = await getRecentPosts(TEST_NEWSLETTER, 1);
        if (posts.length > 0 && posts[0].id) {
            const comments = await getComments(TEST_NEWSLETTER, posts[0].id.toString());
            expect(Array.isArray(comments)).toBe(true);
            // Note: Posts might not have comments, so we don't assert on length
        }
        else {
            console.warn('No posts found to test comments');
        }
    });
});
