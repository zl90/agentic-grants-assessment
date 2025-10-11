import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  getAllAssets,
  deleteAsset,
  getAssetDownloadSignedUrl,
} from '../../client-api/asset';
import styles from './AssetList.module.scss';
import { Asset } from '@baseline/types/asset';

interface AssetListProps {
  onAssetDeleted?: () => void;
}

export interface AssetListRef {
  refresh: () => void;
}

const AssetList = forwardRef<AssetListRef, AssetListProps>(
  ({ onAssetDeleted }, ref) => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedAssets = await getAllAssets();
        setAssets(fetchedAssets);
      } catch (err) {
        setError('Failed to load assets');
        console.error('Error fetching assets:', err);
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      refresh: fetchAssets,
    }));

    useEffect(() => {
      fetchAssets();
    }, []);

    const handleDeleteAsset = async (assetId: string, assetName: string) => {
      if (!window.confirm(`Are you sure you want to delete "${assetName}"?`)) {
        return;
      }

      try {
        await deleteAsset(assetId);
        setAssets(assets.filter((asset) => asset.assetId !== assetId));
        onAssetDeleted?.();
      } catch (err) {
        console.error('Error deleting asset:', err);
        alert('Failed to delete asset');
      }
    };

    const handleDownloadAsset = async (asset: Asset) => {
      try {
        const downloadUrl = await getAssetDownloadSignedUrl(asset.assetId);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = asset.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Error downloading asset:', err);
        alert('Failed to download asset');
      }
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const getAssetIcon = (type: string) => {
      switch (type) {
        case 'IMAGE':
          return '🖼️';
        case 'VIDEO':
          return '🎥';
        case 'DOCUMENT':
        default:
          return '📄';
      }
    };

    if (loading) {
      return (
        <div className={styles.assetList}>
          <h3>Assets</h3>
          <div className={styles.loading}>Loading assets...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.assetList}>
          <h3>Assets</h3>
          <div className={styles.error}>
            {error}
            <button onClick={fetchAssets} className={styles.retryButton}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.assetList}>
        <div className={styles.header}>
          <h3>Assets ({assets.length})</h3>
          <button onClick={fetchAssets} className={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>

        {assets.length === 0 ? (
          <div className={styles.empty}>
            No assets found. Upload some files to get started!
          </div>
        ) : (
          <div className={styles.assetsGrid}>
            {assets.map((asset) => (
              <div key={asset.assetId} className={styles.assetCard}>
                <div className={styles.assetIcon}>
                  {getAssetIcon(asset.type)}
                </div>
                <div className={styles.assetInfo}>
                  <div className={styles.assetName} title={asset.name}>
                    {asset.name}
                  </div>
                  <div className={styles.assetMeta}>
                    <span className={styles.assetType}>{asset.type}</span>
                    <span className={styles.assetDate}>
                      {formatDate(asset.createdAt)}
                    </span>
                  </div>
                </div>
                <div className={styles.assetActions}>
                  <button
                    onClick={() => handleDownloadAsset(asset)}
                    className={styles.downloadButton}
                    title="Download"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(asset.assetId, asset.name)}
                    className={styles.deleteButton}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

AssetList.displayName = 'AssetList';

export default AssetList;
