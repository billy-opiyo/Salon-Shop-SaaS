import { auth } from "@/auth";

export default auth;

export const config = {
  matcher: ["/account/:path*", "/manage/:path*", "/onboarding/:path*"],
};
