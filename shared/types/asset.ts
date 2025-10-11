export interface Asset {
  assetId: string;
  userId: string;
  createdAt: string;
  name: string;
  type: "DOCUMENT" | "IMAGE" | "VIDEO";
  s3Key: string;
}

export interface AssetSignedUrlRequest {
  filename: string;
}

export interface CreateAssetRequest {
  name: string;
  type: "DOCUMENT" | "IMAGE" | "VIDEO";
  filename: string;
}

