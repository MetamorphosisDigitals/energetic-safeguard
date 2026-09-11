import serverless from "serverless-http";
import { createApp } from "../../server/_core/app";

/**
 * Netlify's Express integration runs the same application middleware inside a
 * serverless function. Static Vite assets are served separately by the CDN.
 */
export const handler = serverless(createApp());
