import { TextractAsset } from '@baseline/types/textract-asset';
import { RequestHandler } from './request-handler';

export const getTextractAsset = async (requestHandler: RequestHandler, textractAssetId: string): Promise<TextractAsset> => {
  const response = await requestHandler.request<TextractAsset>({
    method: 'GET',
    url: `textract-asset/${textractAssetId}`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const getAllTextractAssets = async (requestHandler: RequestHandler): Promise<TextractAsset[]> => {
  const response = await requestHandler.request<TextractAsset[]>({
    method: 'GET',
    url: `textract-asset/list`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const deleteTextractAsset = async (requestHandler: RequestHandler, textractAssetId: string): Promise<boolean> => {
  const response = await requestHandler.request<boolean>({
    method: 'DELETE',
    url: `textract-asset/${textractAssetId}`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const createTextractAsset = async (
  requestHandler: RequestHandler,
  textractAsset: Partial<TextractAsset>,
): Promise<TextractAsset> => {
  const response = await requestHandler.request<TextractAsset>({
    method: 'POST',
    url: `textract-asset`,
    hasAuthentication: true,
    data: textractAsset,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const updateTextractAsset = async (
  requestHandler: RequestHandler,
  textractAsset: Partial<TextractAsset>,
): Promise<TextractAsset> => {
  const response = await requestHandler.request<TextractAsset>({
    method: 'PATCH',
    url: `textract-asset`,
    hasAuthentication: true,
    data: textractAsset,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};
