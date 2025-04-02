import * as coingeckoClient from '../coingecko-client.js';
export const coingeckoTools = [
    {
        name: 'coingecko-get-features',
        description: 'Get available CoinGecko API features',
        parameters: {},
        handler: async () => {
            return coingeckoClient.getAvailableFeatures();
        }
    },
    {
        name: 'coingecko-get-price',
        description: 'Get the current price of a token',
        parameters: {
            type: 'object',
            properties: {
                tokenId: {
                    type: 'string',
                    description: 'The CoinGecko token ID (e.g., "bitcoin")'
                },
                currency: {
                    type: 'string',
                    description: 'The currency to get the price in (e.g., "usd")',
                    default: 'usd'
                }
            },
            required: ['tokenId']
        },
        handler: async ({ tokenId, currency }) => {
            return coingeckoClient.getTokenPrice(tokenId, currency);
        }
    },
    {
        name: 'coingecko-get-contracts',
        description: 'Get the contract addresses and chains for a token',
        parameters: {
            type: 'object',
            properties: {
                tokenId: {
                    type: 'string',
                    description: 'The CoinGecko token ID (e.g., "bitcoin")'
                }
            },
            required: ['tokenId']
        },
        handler: async ({ tokenId }) => {
            return coingeckoClient.getTokenContracts(tokenId);
        }
    },
    {
        name: 'coingecko-search',
        description: 'Search for tokens by query',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (default: 10, max: 100)',
                    default: 10
                }
            },
            required: ['query']
        },
        handler: async ({ query, limit }) => {
            return coingeckoClient.searchTokens(query, limit);
        }
    },
    {
        name: 'coingecko-trending',
        description: 'Get trending tokens',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (default: 10)',
                    default: 10
                }
            }
        },
        handler: async ({ limit }) => {
            return coingeckoClient.getTrendingTokens(limit);
        }
    }
];
