## Lời mở đầu
Chào các bạn, dạo gần đây đi đâu cũng thấy mọi người nói về MCP (Model Context Protocol). Từ AI assistant, tool-calling cho tới extension, chỗ nào cũng nghe nhắc tới MCP 😐.



Sẵn đang tìm hiểu, mình muốn chia sẻ với các bạn cách tạo **MCP server đầu tiên** bằng [MCP Framework](https://github.com/QuantGeekDev/mcp-framework). Sau khi tạo xong, chúng ta sẽ test bằng công cụ [MCP Inspector](https://github.com/modelcontextprotocol/inspector), rồi cuối cùng add vào MCP host ở đây là Copilot để sử dụng nhé.

Mục tiêu của bài viết này:
- Hiểu rõ bản chất cốt lõi của MCP là gì, giải quyết vấn đề gì, và kiến trúc hoạt động ra sao.
- Thực hành 1 MCP server có cấu hình khi người dùng hỏi giá vàng hiện tại Agent gọi MCP vừa thiết lập, sau đó trả về kết quả đã được format.

Các bước thực hiện:
1) Bối cảnh hình thành của MCP
2) Tạo MCP server bằng MCP Framework
3) Tạo tool GoldPriceTool để lấy giá vàng
4) Test/Debug bằng MCP Inspector
5) Setup Add MCP Serverr trong Visual Studio Code

---
## 1) Bối cảnh hình thành của MCP
> Trước khi sử dụng các MCP của những hệ thống lớn (Docker MCP, Figma MCP, Chrome DevTools MCP, ...), Chúng ta nên nắm rõ bản chất của MCP sinh ra để giải quyết vấn đề gì Khi hiểu đúng “vì sao có MCP”, phần triển khai phía sau sẽ dễ và chắc hơn rất nhiều.
>
**Trước khi có MCP**

Mỗi AI Agent (M) muốn kết nối với một tool/app (N) thì cần xây dựng một kết nối riêng biệt, dẫn đến ma trận kết nối $M \times N$ phức tạp.
<br>
[![beforeMCP.png](https://i.postimg.cc/tJJ5ZJkZ/Gemini-Generated-Image-lx0fjlx0fjlx0fjl.png)](https://postimg.cc/BPWDRqd4)
<br>
*giả sử bạn có 5 AI và 100 ứng dụng, bạn sẽ cần 5x100 = 500 kết nối riêng biệt, rất là cực chưa kể khi tool thay đổi phương thức kết nối ta phải cập nhật lại tất cả kết nối* 😫😫


**Sau khi MCP ra đời**


 giờ đây MCP đóng vai trò như một cổng kết nối chung, nơi AI Agent (M) và các tool/app (N) chỉ cần kết nối một lần với MCP, sau đó MCP sẽ lo phần trung gian để đảm bảo mọi thứ hoạt động trơn tru. Giờ đây chúng ta chỉ cần  $M + N$ kết nối thay vì $M \times N$

[![aftermcp.png](https://i.postimg.cc/pdtYRqn4/aftermcp.png)](https://postimg.cc/75mTN19n)

*lúc này với 5 AI và 100 ứng dụng, chúng ta chỉ cần 5 + 100 = 105 kết nối, đỡ cực hơn rất nhiều rồi* 😎

## Kiến trúc MCP
MCP hoạt đông dựa trên mô hình client-server, trong đó MCP server sẽ cung cấp các API để AI Agent gọi khi cần sử dụng tool. MCP server sẽ quản lý các tool, nhận yêu cầu từ AI Agent, thực thi tool và trả về kết quả.

[![kientrucmcp.png](https://i.postimg.cc/jSk2h5RB/kientrucmcp.png)](https://postimg.cc/tsW9q9Zz)

Okee lý thuyết như vậy là đủ rồi, giờ chúng ta bắt đầu thực hành tạo MCP server đầu tiên để lấy giá vàng nhé 😁

---

## 2) Tạo MCP server bằng MCP Framework

### Khởi tạo project

```bash
# cài thư viện MCP Framework
npm install -g mcp-framework
# tạo project mới
mcp create my-mcp-server
# vào thư mục project
cd my-mcp-server
```

Sau khi cài xong, chúng ta sẽ có 1 project có cấu trúc là


```text
mcp-server-server/
├─ src/
│  ├─ index.ts
│  └─ tools/
│     └─ ExampleTool.ts
├─ dist/
│  ├─ index.js
│  └─ tools/
│     └─ ExampleTool.js
├─ node_modules/
└─ ...
```

- `src/index.ts`: điểm vào của MCP server, nơi gọi `server.start()`.
- `src/tools/ExampleTool.ts`: tool mẫu để bạn nhìn pattern `name`, `schema`, `execute`.
- `package.json`: scripts build/chạy và dependency của project.
- `dist/`: code sau khi build, Inspector/Copilot sẽ chạy từ đây.

 chúng ta chỉnh sửa code  **ExampleTool** ở path
  `src/tools/ExampleTool.ts`.

```typescript
import { MCPTool } from "mcp-framework";
import { z } from "zod";

interface ExampleInput {
  message: string;
}

class ExampleTool extends MCPTool<ExampleInput> {
  name = "example_tool";
  description = "An example tool that processes messages";

  schema = {
    message: {
      type: z.string(),
      description: "Message to process",
    },
  };

  async execute(input: ExampleInput) {
    return `Processed: ${input.message}`;
  }
}

export default ExampleTool;

```

Giải thích nhanh đoạn code trên:

- `MCPTool<ExampleInput>`: khai báo đây là một MCP tool và kiểu input của tool.
- `name`: tên định danh của tool, tên này sẽ xuất hiện khi gọi `tools/list`.
- `schema`: định nghĩa dữ liệu đầu vào (ở đây là `message` kiểu string).
- `execute(...)`: nơi xử lý logic chính, nhận input và trả kết quả cho client.
- `export default`: để framework tự động load tool từ thư mục `src/tools`.

Như vậy là chúng ta đã có một MCP server cơ bản với một tool mẫu. Bước tiếp theo sẽ là tạo tool thực tế để lấy giá vàng.

---

## 3) Tạo tool GoldPriceTool để lấy giá vàng

### Tạo tool bằng CLI

```bash
mcp add tool GoldPriceTool
```

Framework sẽ sinh file tool trong `src/tools/`.

Các bạn chỉnh lại code trong `GoldPriceTool.ts` thành:

```ts
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
```

Sau khi chỉnh sửa xong, chúng ta build lại project để có code mới trong `dist/`:

```bash
npm run build
```

### Chạy thử local

```bash
node dist/index.js
```
Nếu kết quả hiện
```terminal
[2026-03-04T14:48:13.579Z] [INFO] Initializing MCP Server: my-mcp-server@0.0.1
[2026-03-04T14:48:13.582Z] [INFO] Starting MCP server: (Framework: 0.2.18, SDK: 1.27.1)...
[2026-03-04T14:48:13.591Z] [INFO] Capabilities detected: {"tools":{}}
[2026-03-04T14:48:13.597Z] [INFO] Connecting transport (stdio) to SDK Server...
[2026-03-04T14:48:13.598Z] [INFO] Started my-mcp-server@0.0.1 successfully on transport stdio
[2026-03-04T14:48:13.598Z] [INFO] Tools (2): example_tool, GoldpriceTool
[2026-03-04T14:48:13.599Z] [INFO] Server running and ready
```
Tới đây thì các bạn có thể dùng AI Agent ví dụ như Copilot Chat để gọi tool được rồi, nhưng để test, xem list tools trong server dễ dàng hơn thì mình sẽ dùng MCP Inspector ở bước tiếp theo. 😁

---

## 4) Test/Debug bằng MCP Inspector

Giới thiệu nhanh: đây là tool chính chủ của hệ sinh thái **Model Context Protocol** (repo `modelcontextprotocol/inspector`), dùng để test/debug MCP server rất tiện. Inspector có UI để gọi tool, xem input/output, theo dõi history và debug lỗi theo thời gian thực.

Lưu ý: sau khi điền `Command` và `Arguments`, nhớ bấm **Connect** (nếu trạng thái vẫn là `Disconnected` thì Inspector chưa gọi được server).

[![anhmcpp.png](https://i.postimg.cc/L41Zk8cM/anhmcpp.png)](https://postimg.cc/3W3RYYrL)

### Cách chạy Inspector

Có nhiều cách, nhanh nhất là dùng package chính chủ:

```bash
npx @modelcontextprotocol/inspector
```

Mở UI Inspector, chọn:

- **Transport**: `STDIO`
- **Command**: `node` (dự án chạy bằng Node.js)
- **Arguments**: đường dẫn tới `dist/index.js`

Ví dụ trên Windows:

```text
D:/TongHopProject/my-mcp-server/dist/index.js
```



Sau khi Connect thành công, các bạn bấm **List Tools** để thấy kiểm tra các tool đang có trong server, nếu thấy `GoldpriceTool` là đã thành công bước này rồi đó.

[![anh333.png](https://i.postimg.cc/XvksYggs/anh333.png)](https://postimg.cc/Y4j6XYZF)

Tiếp theo, chúng ta sẽ test gọi tool bằng cách bấm vào **GoldpriceTool** và điền 1 prompt bất kỳ vào `message` rồi bấm **Run Tool**.
[![anh44.png](https://i.postimg.cc/3xBGg7q5/anh44.png)](https://postimg.cc/1884SxPJ)

Ta da kết quả trả về đúng như những gì chúng ta đã thiết kế 😍

Bước tiếp theo sẽ là add server vào **MCP Host** (ở đây là Copilot Chat) để có thể gọi được tool này.

---

## 5) Setup Add MCP Serverr trong Visual Studio Code

Ở bước này, cách nhanh nhất là add server trực tiếp bằng Command Palette:

1. Bấm `Ctrl + Shift + P`.
2. Gõ `> MCP: Add Server...`.
3. Chọn `Command (stdio)`.
4. Ô `Command`, điền: `node`.
5. Điền tên server, ví dụ: `GoldpriceServer`.
6. Chọn  `Global/Workspace` config tùy ý

Sau khi thực hiện các bước trên, các bạn có thể vào file `mcp.json`  nếu lưu ở global config sẽ nằm ở `C:\Users\ADMIN\AppData\Roaming\Code\User\mcp.json`, còn nếu lưu ở workspace config thì sẽ nằm ở thư mục gốc của project hiện tại, và sẽ có nội dung tương tự như sau:

```jsonc
{
		"GoldpriceServer": {
			"type": "stdio",
			"command": "Node",
			"args": []
		}
}
```
ở đây các bạn bổ sung thêm đường dẫn tới file `index.js` trong `dist/` vào phần `args` như sau:

```jsonc
{
    "GoldpriceServer": {
      "type": "stdio",
      "command": "Node",
      "args": ["D:/TongHopProject/my-mcp-server/dist/index.js"]
    }
}
```

Sau đó:

1. Reload VS Code window.
2. Mở Copilot Chat, chọn 1 model bất kì ở chế độ Agent
3. Nhập Prompt : “dùng MCP GoldpriceTool trả giá vàng hiện tại, trả lời ngắn gọn”.

---

## Một vài lỗi thường gặp

- Tool báo `Unknown tool` → sai tên `name` hoặc chưa restart server.
- `Invalid tools/call result` → response không đúng content schema MCP.
- JSON save bị thêm dấu phẩy → do formatter JSONC; chỉnh settings nếu cần.
- Build xong nhớ restart Inspector/Copilot session để nạp bản mới.

---

## Kết bài

Vậy là bạn đã có full flow: **viết MCP server → tạo tool → test bằng Inspector → add vào mcp.json để Copilot gọi được**.

Không cần enterprise drama, chỉ cần chạy được, debug được, và hiểu đường đi của request là bạn hơn rất nhiều người mới bắt đầu rồi 👏

[SourceCode](https://github.com/ductaiii/DemoMcp)

##  Tài liệu tham khảo
- https://modelcontextprotocol.io/docs/getting-started/intro
- https://www.anthropic.com/news/model-context-protocol
- https://www.alibabacloud.com/blog/frontline-practice-of-implementing-a-new-paradigm-of-ai-application-architecture-based-on-mcp_602144
- https://www.dailydoseofds.com/tag/mcp/

## Liên hệ
- Facebook: https://www.facebook.com/ductaiii
-