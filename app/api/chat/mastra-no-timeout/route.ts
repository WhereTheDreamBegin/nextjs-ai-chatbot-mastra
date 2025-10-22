import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as path from 'path';

export const maxDuration = 120; // 2 phút timeout

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('🚀 Running Mastra with NO TIMEOUT limit for:', message);

    // Tạo ReadableStream để streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Chạy ai-action.ts với message của user
          const aiActionPath = path.join(process.cwd(), 'app', 'test', 'ai-action.ts');
          const escapedMessage = message.replace(/"/g, '\\"').replace(/'/g, "\\'");
          const command = `npx tsx "${aiActionPath}" "${escapedMessage}"`;
          
          console.log('🚀 Executing with user message:', command);

          const child = exec(command, {
            cwd: process.cwd(),
            maxBuffer: 100 * 1024 * 1024, // 100MB buffer
            // Không set timeout để cho phép chạy unlimited time
            killSignal: 'SIGTERM',
            env: { 
              ...process.env, 
              NODE_OPTIONS: '--max-old-space-size=4096' // 4GB memory
            }
          });

          let isDone = false;
          let hasStartedStreaming = false;

          child.stdout?.on('data', (data) => {
            const output = data.toString();
            
            if (output.includes('Agent response:')) {
              hasStartedStreaming = true;
              const responseStart = output.indexOf('Agent response:') + 'Agent response:'.length;
              let responseText = output.substring(responseStart).trim();
              
              // Clean up response text
              responseText = responseText.replace(/```markdown\\n/g, '').replace(/```/g, '');
              
              console.log('✅ Got Mastra response, streaming...');
              
              // Split response into chunks for streaming
              const chunkSize = 300; // Larger chunks
              let chunkIndex = 0;
              
              const streamChunk = () => {
                if (chunkIndex < responseText.length && !isDone) {
                  const chunk = responseText.substring(chunkIndex, chunkIndex + chunkSize);
                  chunkIndex += chunkSize;
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
                  
                  // Continue streaming with delay
                  setTimeout(streamChunk, 50);
                } else if (!isDone) {
                  // Completed streaming
                  isDone = true;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                  controller.close();
                  child.kill(); // Kill process after getting response
                }
              };
              
              streamChunk();
            }
          });

          child.stderr?.on('data', (data) => {
            const error = data.toString();
            if (!error.includes('ExperimentalWarning') && !hasStartedStreaming) {
              console.error('Mastra stderr:', error);
            }
          });

          child.on('exit', (code, signal) => {
            console.log(`Process exited with code: ${code}, signal: ${signal}`);
            
            if (!isDone && !hasStartedStreaming) {
              // Nếu chưa có response, gửi thông báo đang xử lý
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                chunk: "⏳ Đang xử lý yêu cầu của bạn bằng Mastra Agent, vui lòng đợi..." 
              })}\n\n`));
              
              // Sau 10 giây nữa mà vẫn chưa có response thì timeout
              setTimeout(() => {
                if (!isDone) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    error: "Mastra Agent đang xử lý yêu cầu phức tạp, vui lòng thử lại với yêu cầu ngắn gọn hơn." 
                  })}\n\n`));
                  controller.close();
                  isDone = true;
                }
              }, 10000);
            } else if (!isDone) {
              // Process ended but we were streaming
              isDone = true;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              controller.close();
            }
          });

          child.on('error', (error) => {
            console.error('Child process error:', error);
            if (!isDone) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                error: "Lỗi khi chạy Mastra Agent: " + error.message 
              })}\n\n`));
              controller.close();
              isDone = true;
            }
          });
          
        } catch (error) {
          console.error('❌ Error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}