import { getReferencePageMarkup } from "@backend/services/referenceMarkup";
import { ReferenceSalonRuntime } from "@/components/reference/ReferenceSalonRuntime";

export default async function NotFound() {
  const page = await getReferencePageMarkup("404.html");
  return (
    <ReferenceSalonRuntime
      markup={page.html}
      bodyClassName={page.bodyClassName}
      headStyles={page.headStyles}
      clientConfig={{}}
      loadSalonRuntime={false}
    />
  );
}
