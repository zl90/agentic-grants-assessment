export interface TextractAsset {
  textractAssetId: string;
  assetId: string;
  jobId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  startedAt: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}
