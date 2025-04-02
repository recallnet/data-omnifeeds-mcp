import axios from 'axios';

/**
 * Normalizes a Substack ID to ensure it's a full domain
 * @param substackId The Substack ID (can be just the ID or a full domain)
 * @returns A normalized Substack domain
 */
function normalizeSubstackId(substackId: string): string {
  // If it already contains a dot, assume it's a full domain
  if (substackId.includes('.')) {
    return substackId;
  }

  // Otherwise, append .substack.com
  return `${substackId}.substack.com`;
}

/**
 * Represents the available features of the Substack client
 */
export interface SubstackFeatures {
  /** Whether basic read access is available */
  basicAccess: boolean;
}

/**
 * Represents a Substack publication user
 */
export interface PublicationUser {
  id: number;
  user_id: number;
  publication_id: number;
  role: string;
  public: boolean;
  is_primary: boolean;
  publication: {
    id: number;
    name: string;
    subdomain: string;
    custom_domain: string | null;
    custom_domain_optional: boolean;
    hero_text: string;
    logo_url: string;
    author_id: number;
    theme_var_background_pop: string;
    created_at: string;
    email_from_name: string | null;
    copyright: string;
    founding_plan_name: string | null;
    community_enabled: boolean;
    invite_only: boolean;
    payments_state: string;
    language: string | null;
    explicit: boolean;
    homepage_type: string | null;
    is_personal_mode: boolean;
  };
}

/**
 * Represents a Substack byline
 */
export interface PublishedByline {
  id: number;
  name: string;
  handle: string;
  previous_name: string | null;
  photo_url: string | null;
  bio: string | null;
  profile_set_up_at: string;
  publicationUsers: PublicationUser[];
  is_guest: boolean;
  bestseller_tier: number | null;
}

/**
 * Represents a Substack post
 */
export interface SubstackPost {
  id: number;
  title: string;
  subtitle: string;
  slug: string;
  post_date: string;
  audience: string;
  cover_image?: string;
  description?: string;
  wordcount?: number;
  type: string;
  canonical_url: string;
  truncated_body_text?: string;
  reaction_count?: number;
  comment_count?: number;
  publishedBylines?: PublishedByline[];
  publication_id?: number;
  body_html?: string;
}

/**
 * Represents the structured details of a fetched Substack post content.
 */
export interface SubstackPostDetails {
  title: string;
  author: string;
  publish_date: string;
  contentHtml?: string;
  contentText?: string;
  canonical_url: string;
  substackDomain: string;
  slug: string;
}

/**
 * Represents a Substack comment
 */
export interface SubstackComment {
  id: number;
  body: string;
  post_id: number;
  user_id: number;
  date: string;
  name: string;
  handle: string;
  photo_url?: string;
  reaction_count?: number;
  children_count?: number;
}

/**
 * Checks what Substack API features are available based on environment variables
 * @returns An object indicating which features are available
 */
export function getAvailableFeatures(): SubstackFeatures {
  // Basic access is always available as the API is public
  return {
    basicAccess: true
  };
}

/**
 * Gets posts from a Substack publication
 * @param substackId The Substack publication ID (subdomain or custom domain)
 * @param limit Maximum number of posts to retrieve (default: 10, max: 50)
 * @param offset Offset for pagination (default: 0)
 * @returns Array of Substack posts
 */
export async function getPosts(substackId: string, limit: number = 10, offset: number = 0): Promise<SubstackPost[]> {
  try {
    // Normalize the Substack ID
    const normalizedId = normalizeSubstackId(substackId);

    // Ensure limit is within bounds
    const validLimit = Math.min(Math.max(1, limit), 50);

    // Construct the URL
    const url = `https://${normalizedId}/api/v1/posts?limit=${validLimit}&offset=${offset}`;

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching posts from ${substackId}:`, error);
    return [];
  }
}

/**
 * Gets posts from a Substack publication sorted by newest first
 * @param substackId The Substack publication ID (subdomain or custom domain)
 * @param limit Maximum number of posts to retrieve (default: 10, max: 50)
 * @param offset Offset for pagination (default: 0)
 * @returns Array of Substack posts
 */
export async function getRecentPosts(substackId: string, limit: number = 10, offset: number = 0): Promise<SubstackPost[]> {
  try {
    // Normalize the Substack ID
    const normalizedId = normalizeSubstackId(substackId);

    // Ensure limit is within bounds
    const validLimit = Math.min(Math.max(1, limit), 50);

    // Construct the URL
    const url = `https://${normalizedId}/api/v1/archive?sort=new&limit=${validLimit}&offset=${offset}`;

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching recent posts from ${substackId}:`, error);
    return [];
  }
}

/**
 * Gets comments for a specific post
 * @param substackId The Substack publication ID (subdomain or custom domain)
 * @param postId The ID of the post to get comments for
 * @returns Array of comments
 */
export async function getComments(substackId: string, postId: string): Promise<SubstackComment[]> {
  try {
    // Normalize the Substack ID
    const normalizedId = normalizeSubstackId(substackId);

    const url = `https://${normalizedId}/api/v1/post/${postId}/comments`;

    const response = await axios.get(url);
    return response.data.comments || [];
  } catch (error) {
    console.error(`Error fetching comments for post ${postId} from ${substackId}:`, error);
    return [];
  }
}

/**
 * Gets a specific post by its slug
 * @param substackId The Substack publication ID (subdomain or custom domain)
 * @param slug The slug of the post to retrieve
 * @returns The post if found, null otherwise
 */
export async function getPostBySlug(substackId: string, slug: string): Promise<SubstackPost | null> {
  try {
    // Normalize the Substack ID
    const normalizedId = normalizeSubstackId(substackId);

    // First try to find the post in the recent posts
    const recentPosts = await getRecentPosts(normalizedId, 50);
    const post = recentPosts.find(p => p.slug === slug);

    if (post) {
      return post;
    }

    // If not found in recent posts, try to search through more posts
    // This is a fallback and might not be efficient for large publications
    const morePosts = await getPosts(normalizedId, 50, 50);
    const morePost = morePosts.find(p => p.slug === slug);

    return morePost || null;
  } catch (error) {
    console.error(`Error fetching post ${slug} from ${substackId}:`, error);
    return null;
  }
}

/**
 * Gets the full content and metadata of a specific post by its URL
 * @param postUrl The full URL of the Substack post (e.g., https://example.substack.com/p/post-slug)
 * @returns A promise resolving to an object containing post details, or throws an error.
 */
export async function getPostContent(postUrl: string): Promise<SubstackPostDetails> {
  let apiUrl = ''; // Declare apiUrl outside the try block
  try {
    const url = new URL(postUrl);
    const substackDomain = url.hostname; // e.g., example.substack.com
    const pathParts = url.pathname.split('/').filter(part => part); // Get path parts, remove empty strings
    const slug = pathParts[pathParts.length - 1]; // Usually the last part

    if (!slug) {
      throw new Error(`Could not extract slug from URL: ${postUrl}`);
    }

    // Construct the specific post API endpoint
    apiUrl = `https://${substackDomain}/api/v1/posts/${slug}`; // Assign value here

    // Fetch the specific post data
    const response = await axios.get<SubstackPost & { body_html?: string }>(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const postData = response.data;

    if (!postData) {
      throw new Error(`Could not retrieve post data from API for URL: ${postUrl}`);
    }

    const title = postData.title || 'Untitled';
    const author = postData.publishedBylines?.[0]?.name || 'Unknown author';
    const publish_date = postData.post_date || new Date().toISOString();
    const contentHtml = postData.body_html;

    if (!contentHtml) {
      throw new Error(`Could not retrieve post content body from API for ${postUrl}. It might be missing or restricted.`);
    }

    // Return structured data
    return {
      title,
      author,
      publish_date,
      contentHtml,
      canonical_url: postData.canonical_url,
      substackDomain,
      slug
    };

  } catch (error: any) {
    console.error(`Error fetching post content from ${postUrl}:`, error);
    const errorMessage = error.response?.status
      ? `API Error: HTTP ${error.response.status} for ${error.config?.url || apiUrl}` // Now apiUrl is accessible
      : error.message;
    throw new Error(`Failed to process post ${postUrl}: ${errorMessage}`);
  }
}

/**
 * Searches for posts containing a specific term
 * @param substackId The Substack publication ID (subdomain or custom domain)
 * @param searchTerm The term to search for
 * @param limit Maximum number of posts to retrieve (default: 10, max: 50)
 * @returns Array of matching posts
 */
export async function searchPosts(substackId: string, searchTerm: string, limit: number = 10): Promise<SubstackPost[]> {
  try {
    // Normalize the Substack ID
    const normalizedId = normalizeSubstackId(substackId);

    // Since there's no direct search API, we'll fetch posts and filter them
    const validLimit = Math.min(Math.max(1, limit), 50);
    const posts = await getPosts(normalizedId, 50); // Get a larger batch to search through

    // Simple search implementation - checks if term appears in title, subtitle, or truncated text
    const searchTermLower = searchTerm.toLowerCase();
    const matchingPosts = posts.filter(post => {
      return (
        (post.title && post.title.toLowerCase().includes(searchTermLower)) ||
        (post.subtitle && post.subtitle.toLowerCase().includes(searchTermLower)) ||
        (post.truncated_body_text && post.truncated_body_text.toLowerCase().includes(searchTermLower))
      );
    }).slice(0, validLimit);

    return matchingPosts;
  } catch (error) {
    console.error(`Error searching posts from ${substackId}:`, error);
    return [];
  }
}

/**
 * Gets basic information about a Substack publication
 * @param substackId The Substack publication ID (subdomain or custom domain)
 * @returns Publication information if available
 */
export async function getPublicationInfo(substackId: string): Promise<any | null> {
  try {
    // Normalize the Substack ID
    const normalizedId = normalizeSubstackId(substackId);

    // We'll extract publication info from the first post's metadata
    const posts = await getRecentPosts(normalizedId, 1);

    if (posts.length > 0) {
      const firstPost = posts[0];

      // First try to extract from publishedBylines if available
      if (firstPost.publishedBylines && firstPost.publishedBylines.length > 0) {
        const byline = firstPost.publishedBylines[0];

        // Extract publication info from the first post's byline
        if (byline.publicationUsers && byline.publicationUsers.length > 0) {
          const pubUser = byline.publicationUsers.find(pu =>
            pu.publication && (
              pu.publication.subdomain === normalizedId ||
              pu.publication.custom_domain === normalizedId
            )
          );

          if (pubUser && pubUser.publication) {
            return {
              id: pubUser.publication.id,
              name: pubUser.publication.name,
              subdomain: pubUser.publication.subdomain,
              custom_domain: pubUser.publication.custom_domain,
              description: pubUser.publication.hero_text,
              logo_url: pubUser.publication.logo_url,
              author: {
                id: byline.id,
                name: byline.name,
                handle: byline.handle,
                photo_url: byline.photo_url,
                bio: byline.bio
              }
            };
          }
        }

        // Fallback with limited info from byline
        return {
          name: byline.name,
          handle: byline.handle,
          photo_url: byline.photo_url,
          bio: byline.bio
        };
      }

      // If publishedBylines is not available, extract what we can from the post itself
      try {
        // Create a publication info object with available fields
        const publicationInfo: any = {};

        // Add fields if they exist
        if (firstPost.publication_id) {
          publicationInfo.id = firstPost.publication_id;
        }

        if (firstPost.canonical_url) {
          publicationInfo.canonical_url = firstPost.canonical_url;
          try {
            const domain = new URL(firstPost.canonical_url).hostname;
            publicationInfo.domain = domain;
            publicationInfo.name = domain.split('.')[0]; // Simple extraction of name from domain
          } catch (e) {
            // URL parsing failed, use normalizedId as fallback
            publicationInfo.domain = normalizedId;
            publicationInfo.name = normalizedId.split('.')[0];
          }
        } else {
          // If no canonical URL, use normalizedId
          publicationInfo.domain = normalizedId;
          publicationInfo.name = normalizedId.split('.')[0];
        }

        // Add a sample post for reference
        publicationInfo.post_sample = {
          id: firstPost.id,
          title: firstPost.title,
          subtitle: firstPost.subtitle,
          post_date: firstPost.post_date
        };

        return publicationInfo;
      } catch (error) {
        console.error(`Error extracting publication info from post:`, error);
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching publication info for ${substackId}:`, error);
    return null;
  }
}

/**
 * Represents a Substack category
 */
export interface CategoryInfo {
  id: number;
  name: string;
}

/**
 * Represents basic information about a Substack newsletter
 */
export interface NewsletterBasicInfo {
  name: string;
  domain: string;
  subdomain?: string;
  custom_domain?: string | null;
}

/**
 * Represents information about a Substack author
 */
export interface AuthorInfo {
  id: number;
  name: string;
  handle: string;
  photo_url?: string | null;
  bio?: string | null;
}

/**
 * Represents a user's subscription to a newsletter
 */
export interface UserSubscription {
  publication_id: number;
  publication_name: string;
  domain: string;
  membership_state: string;
}

/**
 * Represents detailed information about a Substack user
 */
export interface UserProfile {
  id: number;
  name: string;
  handle: string;
  bio?: string | null;
  photo_url?: string | null;
  profile_set_up_at?: string;
  subscriptions?: UserSubscription[];
}

/**
 * Lists all available Substack categories
 * @returns A promise resolving to an array of category information
 */
export async function listCategories(): Promise<CategoryInfo[]> {
  try {
    const endpoint = "https://substack.com/api/v1/categories";
    const response = await axios.get(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    return response.data.map((category: any) => ({
      id: category.id,
      name: category.name
    }));
  } catch (error: any) {
    console.error('Error fetching Substack categories:', error);
    throw new Error(`Failed to fetch Substack categories: ${error.message}`);
  }
}

/**
 * Gets newsletters in a specified category
 * @param categoryId The ID of the category to fetch newsletters for
 * @param page The page number (pagination)
 * @param limit Maximum items per page
 * @returns A promise resolving to an array of newsletter information
 */
export async function getCategoryNewsletters(
  categoryId: number,
  page: number = 0,
  limit: number = 20
): Promise<NewsletterBasicInfo[]> {
  try {
    // Only fetch up to page 20 (API limit)
    const validPage = Math.min(Math.max(0, page), 20);
    const endpoint = `https://substack.com/api/v1/category/public/${categoryId}/all?page=${validPage}`;

    const response = await axios.get(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const newsletters = response.data.publications || [];
    return newsletters.slice(0, limit).map((pub: any) => ({
      name: pub.name || '',
      domain: pub.custom_domain || `${pub.subdomain}.substack.com`,
      subdomain: pub.subdomain,
      custom_domain: pub.custom_domain
    }));
  } catch (error: any) {
    console.error(`Error fetching newsletters for category ${categoryId}:`, error);
    throw new Error(`Failed to fetch newsletters for category ${categoryId}: ${error.message}`);
  }
}

/**
 * Gets information about a Substack user
 * @param username The username/handle of the Substack user
 * @returns A promise resolving to the user's profile information
 */
export async function getUserProfile(username: string): Promise<UserProfile> {
  try {
    const endpoint = `https://substack.com/api/v1/user/${username}/public_profile`;
    const response = await axios.get(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const userData = response.data;
    if (!userData) {
      throw new Error(`User profile not found for username: ${username}`);
    }

    // Format subscriptions data if available
    const subscriptions = userData.subscriptions?.map((sub: any) => {
      const pub = sub.publication;
      const domain = pub.custom_domain || `${pub.subdomain}.substack.com`;
      return {
        publication_id: pub.id,
        publication_name: pub.name,
        domain,
        membership_state: sub.membership_state
      };
    });

    return {
      id: userData.id,
      name: userData.name,
      handle: username,
      bio: userData.bio,
      photo_url: userData.photo_url,
      profile_set_up_at: userData.profile_set_up_at,
      subscriptions: subscriptions || []
    };
  } catch (error: any) {
    console.error(`Error fetching user profile for ${username}:`, error);
    throw new Error(`Failed to fetch user profile for ${username}: ${error.message}`);
  }
}

/**
 * Gets authors of a Substack newsletter
 * @param substackId The Substack publication ID (subdomain or custom domain)
 * @returns A promise resolving to an array of author information
 */
export async function getNewsletterAuthors(substackId: string): Promise<AuthorInfo[]> {
  try {
    const normalizedId = normalizeSubstackId(substackId);
    const endpoint = `https://${normalizedId}/api/v1/publication/users/ranked?public=true`;

    const response = await axios.get(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    return response.data.map((author: any) => ({
      id: author.id,
      name: author.name,
      handle: author.handle,
      photo_url: author.photo_url,
      bio: author.bio
    }));
  } catch (error: any) {
    console.error(`Error fetching authors for ${substackId}:`, error);
    throw new Error(`Failed to fetch authors for ${substackId}: ${error.message}`);
  }
}

/**
 * Gets recommended newsletters for a Substack publication
 * @param substackId The Substack publication ID (subdomain or custom domain)
 * @returns A promise resolving to an array of recommended newsletters
 */
export async function getNewsletterRecommendations(substackId: string): Promise<NewsletterBasicInfo[]> {
  try {
    // First we need to get at least one post to extract the publication ID
    const normalizedId = normalizeSubstackId(substackId);
    const posts = await getRecentPosts(normalizedId, 1);

    if (!posts || posts.length === 0 || !posts[0].publication_id) {
      throw new Error(`Could not find publication ID for ${substackId}`);
    }

    const publicationId = posts[0].publication_id;
    const endpoint = `https://${normalizedId}/api/v1/recommendations/from/${publicationId}`;

    const response = await axios.get(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.data) {
      return [];
    }

    return response.data.map((rec: any) => {
      const publication = rec.recommendedPublication;
      return {
        name: publication.name || '',
        domain: publication.custom_domain || `${publication.subdomain}.substack.com`,
        subdomain: publication.subdomain,
        custom_domain: publication.custom_domain
      };
    });
  } catch (error: any) {
    console.error(`Error fetching recommendations for ${substackId}:`, error);
    throw new Error(`Failed to fetch recommendations for ${substackId}: ${error.message}`);
  }
}