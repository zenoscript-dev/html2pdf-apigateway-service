import { ApiKey } from "../../database/entities";

// Extend Express Request to include user and apiKey
declare global {
  namespace Express {
    interface Request {
      user?: User;
      apiKey?: ApiKey;
    }
  }
}
