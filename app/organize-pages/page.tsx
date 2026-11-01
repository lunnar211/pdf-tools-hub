import { ClientToolPage, clientToolMetadata } from "@/components/client-tool-page";
import { OrganizePagesTool } from "@/components/organize-pages-tool";
import { TOOL_CONTENT } from "@/lib/tool-content";
const c = TOOL_CONTENT["organize-pages"];
export const metadata = clientToolMetadata(c);
export default function Page() {
  return (
    <ClientToolPage c={c}>
      <OrganizePagesTool />
    </ClientToolPage>
  );
}
