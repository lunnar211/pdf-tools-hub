import { ClientToolPage, clientToolMetadata } from "@/components/client-tool-page";
import { OcrTool } from "@/components/ocr-tool";
import { TOOL_CONTENT } from "@/lib/tool-content";
const c = TOOL_CONTENT["ocr-pdf"];
export const metadata = clientToolMetadata(c);
export default function Page() {
  return (
    <ClientToolPage c={c}>
      <OcrTool />
    </ClientToolPage>
  );
}
