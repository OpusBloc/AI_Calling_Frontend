// src/types/kyc.ts

import { KycStatus } from "./auth";

export type KycDocumentType = "PDF" | "IMAGE";

export interface KycUploadResponse {
  success: boolean;
  message: string;
  kycStatus: KycStatus;
}

export interface KycStatusResponse {
  kycStatus: KycStatus;
}

export interface KycDocumentMeta {
  documentType: KycDocumentType;
  documentPath: string;
  uploadedAt: string;
}
