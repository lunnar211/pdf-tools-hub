import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      adminRole: string | null;
      plan: string;
      totpVerifiedAt: string | null;
      ageConfirmed: boolean;
      status: string;
    } & import("next-auth").DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    adminRole?: string | null;
    plan?: string;
    totpVerifiedAt?: string | null;
    ageConfirmed?: boolean;
    status?: string;
  }
}
