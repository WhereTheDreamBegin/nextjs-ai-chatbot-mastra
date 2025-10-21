//npx tsx "E:\FIS\VERCEL-AL2\nextjs-ai-chatbot-mastra\app\test\ai-action.ts"

import { config } from 'dotenv';
import * as path from 'path';

// Xác định thư mục gốc project (2 cấp lên từ app/test/)
const projectRoot = path.resolve(__dirname, '../../');

// Load environment variables
config({ path: path.join(projectRoot, 'mastra-agent/.env') });

// Import mastra trực tiếp

const { mastra } = require(path.join(projectRoot, 'mastra-agent/src/mastra'));

export async function getRequest(inputText: string) {
  const agent = mastra.getAgent("finalAgent");
  const result = await agent.generate(inputText);
  return result;
}

async function testAgent() {
  try {
    const {text} = await getRequest("Phân tích yêu cầu chức năng add to cart");
    console.log("Agent response:", text);
  } catch (error) {
    console.error("Error:", error);
  }
}

testAgent();

