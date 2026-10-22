// src/types/auth.ts

export enum KycStatus {
  NOT_SUBMITTED = "NOT_SUBMITTED",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  role?: string;
  phoneNumber?: string;
  accountStatus?: string;
  kycStatus: KycStatus;
  walletAddress?: string;
  aaWalletAddress?: string | null;
  is2FAEnabled?: boolean;
}

/**
 * Response returned after successful login / signup / 2FA
 */
export interface AuthSuccessResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

/**
 * Response returned when new device detected
 */
export interface TwoFARequiredResponse {
  requires2FA: true;
  userId: string;
  message: string;
}
