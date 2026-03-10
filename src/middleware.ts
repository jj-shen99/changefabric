import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/",
    "/changes/:path*",
    "/impact/:path*",
    "/validations/:path*",
    "/releases/:path*",
    "/metrics/:path*",
    "/settings/:path*",
  ],
};
