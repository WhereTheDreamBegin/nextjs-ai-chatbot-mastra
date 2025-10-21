import { createStep, createWorkflow } from "@mastra/core";
import z from "zod";
import { overviewAgent, mermaidAgent, summaryAgent, uiAgent } from "../agents/ecomerce-agent";


const generateMarkdownStep = createStep({
  id: "generate-markdown",
  description: "Phân tích tổng quan chức năng e-commerce và trả về file markdown",
  retries: 3,
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    text: z.string()
  }),
 
  execute: async ({ inputData }) => {

    //Map input field of inputData into input variable
    const { input } = inputData;

    const prompt = `Phân tích tổng quan chức năng: ${input} trong website e-commerce`;

    const { text } = await overviewAgent.generate([
      { role: "user", content: prompt }
    ]);

    return { text };
  }
});

const generateMermaidStep = createStep({
  id: "generate-mermaid",
  description: "Generate a mermaid diagram and return it as output",
  retries: 3,
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    text: z.string()
  }),
 
  execute: async ({ inputData }) => {

    //Map input field of inputData into input variable
    const { input } = inputData;

    const prompt = `Phân tích và vẽ diagram cho luồng nghiệp vụ của chức năng ${input} dưới dạng mermaid`;

    const { text } = await mermaidAgent.generate([
      { role: "user", content: prompt }
    ]);

    return { text };
  }
});


const uiStep = createStep({
  id: "ui-results",
  description: "Phân tích UI/UX và trả về file markdown",
  retries: 3,
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    text: z.string()
  }),
  execute: async ({ inputData }) => {
    const { input } = inputData;

    const prompt = `
        Phân tích UI/UX của chức năng e-commerce: ${input} trong website e-commerce. Kết quả phân tích trả về dưới định dạng file markdown.
    `;

    const { text } = await uiAgent.generate([
      { role: "user", content: prompt }
    ]);

    return { text };
  }
});




const summarizeStep = createStep({
  id: "summarize-results",
  description: "Summarize markdown and mermaid output",
  retries: 3,
  inputSchema: z.object({
    "generate-markdown": z.object({
      text: z.string()
    }),
    "generate-mermaid": z.object({
      text: z.string()
    }),
    "ui-results": z.object({
      text: z.string()
    })
  }),
  outputSchema: z.object({
    text: z.string()
  }),
  execute: async ({ inputData }) => {
    const markdown = inputData["generate-markdown"].text;
    const mermaid = inputData["generate-mermaid"].text;
    const ui = inputData["ui-results"].text;

    const prompt = `
      Kết hợp các phần sau thành một báo cáo markdown thống nhất:
      ---
      Markdown content:
      ${markdown}

      Mermaid diagrams:
      ${mermaid}

      UI/UX Analysis:
      ${ui}
      ---
      Yêu cầu khi phản hồi: (Tuân thủ 100%)
      Không được tự sinh nội dung mới ngoài phần tổng hợp.
      Chỉ sắp xếp và trình bày lại chúng thành một tài liệu markdown thống nhất, có cấu trúc rõ ràng và dễ đọc.
      Tuyệt đối không tự sinh text dựa trên nội dung đã có.
      LUÔN LUÔN trả về file markdown hoàn chỉnh.
      Nếu có phần nội dung nào không phải định dạng markdown, tự động chuyển nó sang định dạng markdown hoặc xóa bỏ.
    `;

    const { text } = await summaryAgent.generate([
      { role: "user", content: prompt }
    ]);

    return { text };
  }
});



const ecommerceWorkflow = createWorkflow({
  id: 'ecommerce-workflow',
  inputSchema: z.object({
    input: z.string().describe('The topic need to analyze for e-commerce website'),
  }),
  outputSchema: z.object({
    text: z.string()
  }),
})
  .parallel([generateMarkdownStep, generateMermaidStep, uiStep])
  .then(summarizeStep);

ecommerceWorkflow.commit();

export { ecommerceWorkflow };