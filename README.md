# Recall Data Omnifeeds

A Model Context Protocol (MCP) server that provides access to various data feeds including Twitter, Substack, and CoinGecko. This server enables AI models to interact with and analyze data from multiple sources through a unified interface.

## Features

- **Twitter Integration**
  - Get user profiles and tweets
  - Search tweets and profiles
  - Access trending topics
  - Full write access (tweet, like, retweet, follow)
  - Direct messaging support
  - Grok chat integration

- **Substack Integration**
  - Get publication information
  - Retrieve recent posts
  - Access post comments
  - Search posts
  - Support for both custom domains and subdomains

- **CoinGecko Integration**
  - Get current token prices
  - Retrieve contract addresses and chains
  - Search for tokens
  - Get trending tokens
  - Support for both free and Pro API access

## Integrate with Claude

1. Install and build the server:
   ```bash
   npm install
   npm run build
   ```

2. In Claude, go to Settings -> Developer -> Add MCP endpoint

3. Add the following configuration:
   ```json
   {
     "mcpServers": {
       "recall-data-omnifeeds": {
         "command": "node",
         "args": ["path to omnifeeds build they just created"],
         "env": {
           "PORT": "3008",
           "TWITTER_USERNAME": "xx",
           "TWITTER_PASSWORD": "xxx",
           "TWITTER_EMAIL": "xxx",
           "COINGECKO_API_KEY": "xxx" (optional)
         }
       }
   }
   ```

4. Restart Claude

5. Verify the integration:
   - Look for a number next to a hammer icon in the bottom right of the prompt input
   - Test the integration by asking:
     ```
     has anyone mentioned a cool coin lately on this list https://x.com/i/lists/1879866762147303588?
     ```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/recall-data-omnifeeds.git
   cd recall-data-omnifeeds
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your API credentials:
   ```
   # Twitter credentials (if needed)
   TWITTER_USERNAME=your_twitter_username
   TWITTER_PASSWORD=your_twitter_password
   TWITTER_EMAIL=your_twitter_email

   # CoinGecko credentials (optional)
   COINGECKO_API_KEY=your_api_key  # Optional: enables Pro API features
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the server:
   ```bash
   npm start
   ```

## Usage

The server implements the Model Context Protocol (MCP) and can be used with any MCP-compatible client. Here are some example invocations:

### Twitter Examples

```javascript
// Get a user's profile
const result = await server.invoke("twitter-get-profile", {
  username: "example_user"
});

// Get recent tweets
const result = await server.invoke("twitter-get-tweets", {
  username: "example_user",
  count: 10
});

// Search tweets
const result = await server.invoke("twitter-search-tweets", {
  query: "example search",
  count: 20
});
```

### Substack Examples

```javascript
// Get publication info
const result = await server.invoke("substack-get-publication-info", {
  substackId: "example.substack.com"
});

// Get recent posts
const result = await server.invoke("substack-get-recent-posts", {
  substackId: "example.substack.com",
  limit: 10
});

// Search posts
const result = await server.invoke("substack-search-posts", {
  substackId: "example.substack.com",
  searchTerm: "example search",
  limit: 10
});
```

### CoinGecko Examples

```javascript
// Get token price
const result = await server.invoke("coingecko-get-price", {
  tokenId: "bitcoin",
  currency: "usd"
});

// Get contract addresses
const result = await server.invoke("coingecko-get-contracts", {
  tokenId: "usd-coin"
});

// Search tokens
const result = await server.invoke("coingecko-search", {
  query: "ethereum",
  limit: 5
});

// Get trending tokens
const result = await server.invoke("coingecko-trending", {
  limit: 5
});
```

## API Reference

### Twitter Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `twitter-get-profile` | Get a user's profile information | `username` (required) |
| `twitter-get-tweets` | Get recent tweets from a user | `username` (required), `count` (optional, default: 10) |
| `twitter-search-tweets` | Search for tweets | `query` (required), `count` (optional, default: 20) |
| `twitter-get-trends` | Get trending topics | None |
| `twitter-send-tweet` | Send a tweet | `text` (required) |
| `twitter-like-tweet` | Like a tweet | `tweetId` (required) |
| `twitter-retweet` | Retweet a tweet | `tweetId` (required) |
| `twitter-follow-user` | Follow a user | `username` (required) |

### Substack Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `substack-get-publication-info` | Get publication information | `substackId` (required) |
| `substack-get-recent-posts` | Get recent posts | `substackId` (required), `limit` (optional, default: 10) |
| `substack-search-posts` | Search posts | `substackId` (required), `searchTerm` (required), `limit` (optional, default: 10) |
| `substack-get-comments` | Get comments for a post | `substackId` (required), `postId` (required) |

### CoinGecko Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `coingecko-get-features` | Get available CoinGecko API features | None |
| `coingecko-get-price` | Get the current price of a token | `tokenId` (required), `currency` (optional, default: "usd") |
| `coingecko-get-contracts` | Get contract addresses and chains for a token | `tokenId` (required) |
| `coingecko-search` | Search for tokens by query | `query` (required), `limit` (optional, default: 10) |
| `coingecko-trending` | Get trending tokens | `limit` (optional, default: 10) |

## Development

### Project Structure

```
recall-data-omnifeeds/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── twitter-client.ts     # Twitter API client
│   ├── substack-client.ts    # Substack API client
│   ├── coingecko-client.ts   # CoinGecko API client
│   └── tools/               # MCP tool implementations
├── dist/                    # Compiled JavaScript files
├── package.json            # Project configuration
└── tsconfig.json          # TypeScript configuration
```

### Building

```bash
npm run build
```

### Running Tests

```bash
npm test
```

## License

ISC

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request