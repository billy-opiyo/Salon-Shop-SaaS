import { getReferencePageMarkup } from "@backend/services/referenceMarkup";
import { ReferenceSalonRuntime } from "@/components/reference/ReferenceSalonRuntime";

export default async function VerifyEmailPage() {
  const page = await getReferencePageMarkup("verify-email.html");
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
