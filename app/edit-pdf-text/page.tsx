import { ClientToolPage, clientToolMetadata } from "@/components/client-tool-page";
import { EditPdfTextTool } from "@/components/edit-pdf-text-tool";
import { TOOL_CONTENT } from "@/lib/tool-content";
const c = TOOL_CONTENT["edit-pdf-text"];
export const metadata = clientToolMetadata(c);
export default function Page() {
  return (
    <ClientToolPage c={c}>
      <EditPdfTextTool />
    </ClientToolPage>
  );
}
