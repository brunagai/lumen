export { httpAuthAdapter as authAdapter } from "@/adapters/auth/http";
export {
  canAccessInstitutionPortal,
  requireInstitutionRole,
  sessionSchema,
  signInInputSchema,
  type AuthMethod,
  type AuthPort,
  type Session,
  type SignInInput,
  type UserRole,
} from "@/adapters/auth/types";
