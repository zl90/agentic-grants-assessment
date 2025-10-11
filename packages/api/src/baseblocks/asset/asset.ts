import { Asset } from '@baseline/types/asset';

export const assetMapper = (data: Asset): Asset => {
  const asset: Asset = {
    assetId: data?.assetId,
    userId: data?.userId,
    createdAt: data?.createdAt,
    name: data?.name,
    type: data?.type,
    s3Key: data?.s3Key,
  };
  return asset;
};
