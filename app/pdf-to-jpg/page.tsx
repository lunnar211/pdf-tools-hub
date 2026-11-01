import { ClientToolPage, clientToolMetadata } from "@/components/client-tool-page";
import { PdfToJpgTool } from "@/components/pdf-to-jpg-tool";
import { TOOL_CONTENT } from "@/lib/tool-content";
const c = TOOL_CONTENT["pdf-to-jpg"];
export const metadata = clientToolMetadata(c);
export default function Page() {
  return (
    <ClientToolPage c={c}>
      <PdfToJpgTool />
    </ClientToolPage>
  );
}
