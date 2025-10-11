import { Response } from 'express';
import { assetMapper } from './asset';
import { isAdmin } from '../../middleware/is-admin';
import { RequestContext } from '../../util/request-context.type';
import { Asset, CreateAssetRequest } from '@baseline/types/asset';
import { getErrorMessage } from '../../util/error-message';
import createApp from '../../util/express-app';
import createAuthenticatedHandler from '../../util/create-authenticated-handler';
import { assetService } from './asset.service';
import { S3Client } from '@aws-sdk/client-s3';

const app = createApp();
export const handler = createAuthenticatedHandler(app);

const ASSET_UPLOAD_PATH = `${process.env.APP_NAME}/${process.env.NODE_ENV}/asset`;


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
