import { MCPTool } from 'mcp-framework'
import { z } from 'zod'

interface ExampleInput {
  message: string
}

class ExampleTool extends MCPTool<ExampleInput> {
  name = 'example_tool'
  description = 'An example tool that processes messages'

  schema = {
    message: {
      type: z.string(),
      description: 'Message to process',
    },
  }

  async execute(input: ExampleInput) {
    return `Đã xử lý: ${input.message}`
  }

  protected createErrorResponse(error: Error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Lỗi công cụ: ${error.message}`,
        },
      ],
    }
  }
}

export default ExampleTool
