import { ClientToolPage, clientToolMetadata } from "@/components/client-tool-page";
import { RotatePdfTool } from "@/components/rotate-pdf-tool";
import { TOOL_CONTENT } from "@/lib/tool-content";
const c = TOOL_CONTENT["rotate-pdf"];
export const metadata = clientToolMetadata(c);
export default function Page() {
  return (
    <ClientToolPage c={c}>
      <RotatePdfTool />
    </ClientToolPage>
  );
}
