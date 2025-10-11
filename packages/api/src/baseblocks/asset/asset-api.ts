import { Response } from 'express';
import { assetMapper } from './asset';
import { isAdmin } from '../../middleware/is-admin';
import { RequestContext } from '../../util/request-context.type';
import { Asset, AssetSignedUrlRequest, CreateAssetRequest } from '@baseline/types/asset';
import { getErrorMessage } from '../../util/error-message';
import createApp from '../../util/express-app';
import createAuthenticatedHandler from '../../util/create-authenticated-handler';
import { assetService } from './asset.service';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = createApp();
export const handler = createAuthenticatedHandler(app);

const ASSET_UPLOAD_PATH = `${process.env.APP_NAME}/${process.env.NODE_ENV}/asset`;
const SIGNED_URL_EXPIRATION = 3600; // 1 hour

app.get('/asset/list', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const assets = await assetService.getAll();
      const formattedAssets = assets.map(assetMapper);
      res.json(formattedAssets);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get assets: ${message}`);
      res.status(400).json({
        error: 'Failed to get assets',
      });
    }
  },
]);

app.get('/asset/:assetId/signed-url', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    const assetId = req.params.assetId;

    try {
      const asset = await assetService.get(assetId);

      const s3 = new S3Client({ region: process.env.API_REGION });
      const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.ASSET_BUCKET_NAME,
        Key: asset.s3Key,
      });

      const signedUrl = await getSignedUrl(s3, getObjectCommand, { expiresIn: SIGNED_URL_EXPIRATION });

      res.json(signedUrl);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get signed download url for asset ${assetId}: ${message}`);
      res.status(400).json({
        error: `Failed to get signed download url for asset ${assetId}`,
      });
    }
  },
]);

app.post('/asset/signed-url', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    const { filename } = req.body as AssetSignedUrlRequest;

    try {
      const key = `${ASSET_UPLOAD_PATH}/${filename}`;

      const s3 = new S3Client({ region: process.env.API_REGION });
      const putObjectCommand = new PutObjectCommand({
        Bucket: process.env.ASSET_BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3, putObjectCommand, { expiresIn: SIGNED_URL_EXPIRATION });

      const response = { signedUrl, key, filename };
      res.json(response);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get signed upload url for asset ${filename}: ${message}`);
      res.status(400).json({
        error: `Failed to get signed upload url for asset ${filename}`,
      });
    }
  },
]);

app.post('/asset', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const { name, type, filename } = req.body as CreateAssetRequest;

      const key = `${ASSET_UPLOAD_PATH}/${filename}`;

      const assetData: Partial<Asset> = {
        userId: req.currentUserSub,
        s3Key: key,
        name,
        type,
        createdAt: new Date().toUTCString(),
      };

      const asset = await assetService.create(assetData);
      res.json(assetMapper(asset));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to create asset ${message}`);
      res.status(400).json({ error: 'Failed to create asset' });
    }
  },
]);

app.get('/asset/:assetId', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const asset = await assetService.get(req.params.assetId);
      res.json(assetMapper(asset));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get asset: ${message}`);
      res.status(400).json({
        error: 'Failed to get asset',
      });
    }
  },
]);

app.delete('/asset/:assetId', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const assetId = req.params.assetId;
      await assetService.delete(assetId);
      res.status(200);
      res.send();
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to delete asset: ${message}`);
      res.status(400).json({
        error: 'Failed to delete asset',
      });
    }
  },
]);
