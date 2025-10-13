import { TextractAsset } from '@baseline/types/textract-asset';

export const textractAssetMapper = (data: TextractAsset): TextractAsset => {
  const textractAsset: TextractAsset = {
    textractAssetId: data?.textractAssetId,
    assetId: data?.assetId,
    jobId: data?.jobId,
    status: data?.status,
    startedAt: data?.startedAt,
    completedAt: data?.completedAt,
    errorCode: data?.errorCode,
    errorMessage: data?.errorMessage,
  };
  return textractAsset;
};
