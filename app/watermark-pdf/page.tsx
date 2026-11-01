import { ClientToolPage, clientToolMetadata } from "@/components/client-tool-page";
import { WatermarkTool } from "@/components/watermark-tool";
import { TOOL_CONTENT } from "@/lib/tool-content";
const c = TOOL_CONTENT["watermark-pdf"];
export const metadata = clientToolMetadata(c);
export default function Page() {
  return (
    <ClientToolPage c={c}>
      <WatermarkTool />
    </ClientToolPage>
  );
}
