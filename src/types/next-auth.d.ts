import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    canUseAI?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      canUseAI: boolean;
    };
  }
}
