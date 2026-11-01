import { ClientToolPage, clientToolMetadata } from "@/components/client-tool-page";
import { PageNumbersTool } from "@/components/page-numbers-tool";
import { TOOL_CONTENT } from "@/lib/tool-content";
const c = TOOL_CONTENT["page-numbers"];
export const metadata = clientToolMetadata(c);
export default function Page() {
  return (
    <ClientToolPage c={c}>
      <PageNumbersTool />
    </ClientToolPage>
  );
}
