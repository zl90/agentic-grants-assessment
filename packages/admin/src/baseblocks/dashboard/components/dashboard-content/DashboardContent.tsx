import React, { useRef } from 'react';
import styles from './DashboardContent.module.scss';
import AssetUpload from '@baseline/components/asset-upload/AssetUpload';
import AssetList, {
  AssetListRef,
} from '@baseline/components/asset-list/AssetList';
import {
  createAsset,
  getAssetUploadSignedUrl,
} from '@baseline/client-api/asset';

const DashboardContent = (): JSX.Element => {
  const assetListRef = useRef<AssetListRef>(null);

  const handleAssetUploaded = async (key: string, assetName: string) => {
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

    if (assetListRef.current) {
      await assetListRef.current.refresh();
    }
  };

  const handleGetAssetUploadSignedUrl = async (req: { filename: string }) => {
    const result = await getAssetUploadSignedUrl(req.filename);
    return result.signedUrl;
  };

  const handleAssetDeleted = async () => {
    if (assetListRef.current) {
      assetListRef.current.refresh();
    }
  };

  return (
    <div className={styles.dashboard}>
      <h1>Asset Management Dashboard</h1>
      <div className={styles.grid}>
        <div className={styles.uploadSection}>
          <h2>Upload Files</h2>
          <AssetUpload
            onAssetsUploaded={handleAssetUploaded}
            getAssetUploadSignedUrl={handleGetAssetUploadSignedUrl}
          />
        </div>
        <div className={styles.assetsSection}>
          <h2>Your Assets</h2>
          <AssetList ref={assetListRef} onAssetDeleted={handleAssetDeleted} />
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
