//npx tsx "E:\FIS\VERCEL-AL2\nextjs-ai-chatbot-mastra\app\test\ai-action.ts"

import { config } from 'dotenv';
import * as path from 'path';

// Xác định thư mục gốc project (2 cấp lên từ app/test/)
const projectRoot = path.resolve(__dirname, '../../');

// Load environment variables
config({ path: path.join(projectRoot, 'mastra-agent/.env') });

// Import mastra trực tiếp

const { mastra } = require(path.join(projectRoot, 'mastra-agent/src/mastra'));


//Not Streaming version
export async function getRequest(inputText: string) {
  const agent = mastra.getAgent("finalAgent");
  const result = await agent.generate(inputText);
  return result;
}


//Streaming version for web
export async function getRequestStreaming(inputText: string) {
  const agent = mastra.getAgent("finalAgent");
  
  return new Promise((resolve, reject) => {
    let fullResponse = "";
    
    agent.generate(inputText, {
      stream: true,
      onChunk: (chunk: any) => {
        // Chỉ xử lý text-delta chunks để streaming text
        if (chunk.chunk && chunk.chunk.type === 'text-delta') {
          const textDelta = chunk.chunk.text;
          fullResponse += textDelta;
        }
      }
    }).then((result: any) => {
      resolve({ text: fullResponse, result });
    }).catch((error: any) => {
      reject(error);
    });
  });
}

//Streaming version with callback for real-time streaming
export async function getRequestStreamingWithCallback(
  inputText: string, 
  onChunk: (chunk: string) => void
) {
  const agent = mastra.getAgent("finalAgent");
  
  return new Promise((resolve, reject) => {
    let fullResponse = "";
    
    agent.generate(inputText, {
      stream: true,
      onChunk: (chunk: any) => {
        // Chỉ xử lý text-delta chunks để streaming text
        if (chunk.chunk && chunk.chunk.type === 'text-delta') {
          const textDelta = chunk.chunk.text;
          onChunk(textDelta); // Gọi callback với chunk mới
          fullResponse += textDelta;
        }
      }
    }).then((result: any) => {
      resolve({ text: fullResponse, result });
    }).catch((error: any) => {
      reject(error);
    });
  });
}



async function testAgent() {
  try {
    // Lấy message từ command line arguments
    const args = process.argv.slice(2);
    const userMessage = args.length > 0 ? args.join(' ') : "Phân tích yêu cầu chức năng add to cart";
    
    console.log("Processing user message:", userMessage);
    const {text} = await getRequestStreaming(userMessage) as any;
    console.log("======================Agent response:", text);
  } catch (error) {
    console.error("Error:", error);
  }
}

testAgent();

