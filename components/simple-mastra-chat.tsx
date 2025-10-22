"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChatMessage } from "@/lib/types";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export function SimpleMastraChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    const assistantMessageId = (Date.now() + 1).toString();

    try {
      let fullResponse = "";
      
      console.log('🚀 Sending to NO-TIMEOUT Mastra Agent:', userMessage.content);
      
      // Quay lại sử dụng endpoint no-timeout đã hoạt động ổn định
      const response = await fetch('/api/chat/mastra-no-timeout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.chunk) {
                fullResponse += data.chunk;
                setStreamingContent(fullResponse);
              } else if (data.done) {
                fullResponse = data.fullText || fullResponse;
                break;
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }

      // Hoàn thành streaming, thêm message cuối cùng
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent("");

    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setStreamingContent("");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            🤖 Mastra AI Agent Chat
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isStreaming && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Đang trả lời...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                👋 Xin chào! Tôi là Mastra AI Agent
              </div>
              <div className="text-sm text-gray-500">
                Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    🤖
                  </AvatarFallback>
                </Avatar>
              )}
              
              <Card 
                className={`max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border'
                }`}
              >
                <CardContent className="p-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {message.content}
                  </pre>
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>

              {message.role === 'user' && (
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="bg-gray-100 text-gray-600">
                    👤
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  🤖
                </AvatarFallback>
              </Avatar>
              
              <Card className="max-w-[80%] bg-white border">
                <CardContent className="p-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {streamingContent}
                  </pre>
                  <div className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1"></div>
                </CardContent>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="bg-white border-t px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter để xuống dòng)"
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              disabled={isStreaming}
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isStreaming}
              className="px-4"
            >
              {isStreaming ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Gửi"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}