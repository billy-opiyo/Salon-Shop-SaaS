import { auth } from "@/auth";

export default auth;

export const config = {
  matcher: ["/manage/:path*", "/onboarding/:path*"],
};
