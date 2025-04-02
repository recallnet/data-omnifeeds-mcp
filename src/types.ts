/**
 * Represents a tool that can be used by the MCP server
 */
export interface Tool {
  /** The name of the tool */
  name: string;
  /** A description of what the tool does */
  description: string;
  /** The parameters the tool accepts */
  parameters: {
    type?: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  /** The function that handles the tool's execution */
  handler: (params: any) => Promise<any>;
}