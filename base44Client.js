import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "6900f95cd2fdf6f6761e2df5", 
  requiresAuth: true // Ensure authentication is required for all operations
});
