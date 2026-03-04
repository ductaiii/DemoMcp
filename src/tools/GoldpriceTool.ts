import { MCPTool } from 'mcp-framework'
import { z } from 'zod'

interface Input {
  message: string
}

type ApiRes = {
  success: boolean
  name: string
  buy: number
  sell: number
  change_buy: number
  change_sell: number
  time: string
  date: string
}

class GoldpriceTool extends MCPTool<Input> {
  // Tên tool sẽ hiển thị trong MCP Inspector
  name = 'GoldpriceTool'
  description = 'Lấy giá vàng hiện tại'
  protected useStringify = false

  schema = {
    message: { type: z.string(), description: 'Nhập gì cũng được' },
  }

  private vnd = (n: number) => `${n.toLocaleString('vi-VN')} ₫`
  private trend = (n: number) =>
    n > 0
      ? `tăng ${this.vnd(n)}`
      : n < 0
        ? `giảm ${this.vnd(Math.abs(n))}`
        : 'không đổi'

  async execute(_input: Input) {
    // Gọi API giá vàng SJC 9999
    const r = await fetch('https://www.vang.today/api/prices?type=SJL1L10')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = (await r.json()) as ApiRes
    if (!d.success) throw new Error('API không thành công')

    const buyTrendIcon =
      d.change_buy > 0 ? '📈' : d.change_buy < 0 ? '📉' : '➖'
    const sellTrendIcon =
      d.change_sell > 0 ? '📈' : d.change_sell < 0 ? '📉' : '➖'

    // Trả kết quả
    return [
      `✨ ${d.name}`,
      `💰 Giá mua: ${this.vnd(d.buy)}`,
      `🏷️ Giá bán: ${this.vnd(d.sell)}`,
      `${buyTrendIcon} Biến động mua: ${this.trend(d.change_buy)}`,
      `${sellTrendIcon} Biến động bán: ${this.trend(d.change_sell)}`,
      `🕒 Thời gian: ${d.time} ${d.date}`,
    ].join('\n')
  }

  protected createErrorResponse(error: Error) {
    return {
      content: [
        { type: 'text' as const, text: `Lỗi lấy giá vàng: ${error.message}` },
      ],
    }
  }
}

export default GoldpriceTool
