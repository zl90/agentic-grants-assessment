import { Response } from 'express';
import { textractAssetMapper } from './textract-asset';
import { isAdmin } from '../../middleware/is-admin';
import { RequestContext } from '../../util/request-context.type';
import { TextractAsset } from '@baseline/types/textract-asset';
import { getErrorMessage } from '../../util/error-message';
import createApp from '../../util/express-app';
import createAuthenticatedHandler from '../../util/create-authenticated-handler';
import { textractAssetService } from './textract-asset.service';

const app = createApp();
export const handler = createAuthenticatedHandler(app);

app.post('/textract-asset', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const { assetId, jobId, status, startedAt, completedAt, errorCode, errorMessage } = req.body as TextractAsset;
      const textractAssetData: Partial<TextractAsset> = {
        assetId, jobId, status, startedAt, completedAt, errorCode, errorMessage,
      };
      const textractAsset = await textractAssetService.create(textractAssetData);
      res.json(textractAssetMapper(textractAsset));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to create textract asset ${message}`);
      res.status(400).json({ error: 'Failed to create textract asset' });
    }
  },
]);

app.patch('/textract-asset', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const { textractAssetId, assetId, jobId, status, startedAt, completedAt, errorCode, errorMessage } = req.body as TextractAsset;
      const textractAssetData: Partial<TextractAsset> = {
        textractAssetId, assetId, jobId, status, startedAt, completedAt, errorCode, errorMessage
      };
      const textractAsset = await textractAssetService.update(textractAssetData);
      res.json(textractAssetMapper(textractAsset));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to update textract asset: ${message}`);
      res.status(400).json({
        error: 'Failed to update textract asset',
      });
    }
  },
]);

app.delete('/textract-asset/:textractAssetId', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const textractAssetId = req.params.textractAssetId;
      await textractAssetService.delete(textractAssetId);
      res.status(200);
      res.send();
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to delete textract asset: ${message}`);
      res.status(400).json({
        error: 'Failed to delete textract asset',
      });
    }
  },
]);

app.get('/textract-asset/list', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const textractAssets = await textractAssetService.getAll();
      const formattedTextractAssets = textractAssets.map(textractAssetMapper);
      res.json(formattedTextractAssets);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get textract assets: ${message}`);
      res.status(400).json({
        error: 'Failed to get textract assets',
      });
    }
  },
]);

app.get('/textract-asset/:textractAssetId', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const textractAsset = await textractAssetService.get(req.params.textractAssetId);
      res.json(textractAssetMapper(textractAsset));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get textract asset: ${message}`);
      res.status(400).json({
        error: 'Failed to get textract asset',
      });
    }
  },
]);
