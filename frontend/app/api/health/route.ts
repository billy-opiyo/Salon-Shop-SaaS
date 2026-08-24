export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({
    status: "ok",
    service: "salon-shop-saas",
    database: "not-checked",
    providers: "not-checked",
  });
}
