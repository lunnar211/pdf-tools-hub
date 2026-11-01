import { ClientToolPage, clientToolMetadata } from "@/components/client-tool-page";
import { ImageToPdfTool } from "@/components/image-to-pdf-tool";
import { TOOL_CONTENT } from "@/lib/tool-content";
const c = TOOL_CONTENT["image-to-pdf"];
export const metadata = clientToolMetadata(c);
export default function Page() {
  return (
    <ClientToolPage c={c}>
      <ImageToPdfTool />
    </ClientToolPage>
  );
}
