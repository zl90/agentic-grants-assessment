import React from 'react';
import styles from './DashboardContent.module.scss';
import AssetUpload from '@baseline/components/asset-upload/AssetUpload';
import {
  createAsset,
  getAssetUploadSignedUrl,
} from '@baseline/client-api/asset';

const DashboardContent = (): JSX.Element => {
  return (
    <div className={styles.dashboard}>
      <h1>Dashboard</h1>
      <div className={styles.grid}>
        <div className={styles.preview}>
          <h2>My Site Preview</h2>
          <AssetUpload
            uploadPath="my-site-preview"
            onAssetsUploaded={async (key, assetName) => {
              const assetType =
                key.includes('png') ||
                key.includes('jpg') ||
                key.includes('jpeg') ||
                key.includes('gif') ||
                key.includes('heic')
                  ? key.includes('mov') || key.includes('mp4')
                    ? 'VIDEO'
                    : 'IMAGE'
                  : 'DOCUMENT';

              await createAsset({
                name: assetName,
                type: assetType,
                filename: key,
              });
            }}
            getAssetUploadSignedUrl={async (req) => {
              const result = await getAssetUploadSignedUrl(req.filename);
              return result.signedUrl;
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
