// Type augmentations for the application

// For Transport interface extensions
interface Transport {
  // Ensure handlePostMessage returns void to satisfy Express RequestHandler requirements
  handlePostMessage(req: any, res: any): Promise<void>;
}