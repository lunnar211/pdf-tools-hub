import { ToolPage, toolMetadata } from "@/components/tool-page";
import { TOOL_CONTENT } from "@/lib/tool-content";
const c = TOOL_CONTENT["word-to-pdf"];
export const metadata = toolMetadata(c);
export default function Page() { return <ToolPage c={c} />; }
