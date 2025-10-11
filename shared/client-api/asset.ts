import { Asset, CreateAssetRequest } from '@baseline/types/asset';
import { getRequestHandler, RequestHandler } from './request-handler';

export const getAssetUploadSignedUrl = async (filename: string): Promise<{ signedUrl: string; key: string; filename: string }> => {
  const response = await getRequestHandler()?.request<{ signedUrl: string; key: string; filename: string }>({
    method: 'POST',
    url: `asset/signed-url`,
    hasAuthentication: true,
    data: { filename },
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const getAssetDownloadSignedUrl = async (assetId: string): Promise<string> => {
  const response = await getRequestHandler()?.request<string>({
    method: 'GET',
    url: `asset/${assetId}/signed-url`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const getAsset = async (assetId: string): Promise<Asset> => {
  const response = await getRequestHandler()?.request<Asset>({
    method: 'GET',
    url: `asset/${assetId}`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const getAllAssets = async (): Promise<Asset[]> => {
  const response = await getRequestHandler()?.request<Asset[]>({
    method: 'GET',
    url: `asset/list`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const deleteAsset = async (assetId: string): Promise<boolean> => {
  const response = await getRequestHandler()?.request<boolean>({
    method: 'DELETE',
    url: `asset/${assetId}`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const createAsset = async (
  asset: CreateAssetRequest,
): Promise<Asset> => {
  const response = await getRequestHandler()?.request<Asset>({
    method: 'POST',
    url: `asset`,
    hasAuthentication: true,
    data: asset,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};
