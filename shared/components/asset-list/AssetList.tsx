import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import useSWR from 'swr';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import {
  getAllAssets,
  deleteAsset,
  getAssetDownloadSignedUrl,
} from '../../client-api/asset';
import { getTextractAssetByAssetId } from '../../client-api/textract-asset';
import { getBedrockResponseForAsset } from '../../client-api/bedrock-response';
import { getRequestHandler } from '../../client-api/request-handler';
import styles from './AssetList.module.scss';
import { Asset } from '@baseline/types/asset';
import { TextractAsset } from '@baseline/types/textract-asset';
import { BedrockResponse } from '@baseline/types/bedrock-response';

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
    const [selectedBedrockResponse, setSelectedBedrockResponse] =
      useState<BedrockResponse | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const AssetStatusBadge = ({
      assetId,
      assetType,
    }: {
      assetId: string;
      assetType: string;
    }) => {
      if (assetType !== 'DOCUMENT') {
        return null;
      }

      const requestHandler = getRequestHandler();
      const { data: textractAssets, error } = useSWR<TextractAsset[]>(
        `textract-asset-${assetId}`,
        () => getTextractAssetByAssetId(requestHandler, assetId),
        {
          refreshInterval: 5000, // Poll every 5 seconds for IN_PROGRESS status
          revalidateOnFocus: true,
        },
      );

      if (error || !textractAssets || textractAssets.length === 0) {
        return <span className={styles.statusBadgeLoading}>Processing...</span>;
      }

      const textractAsset = textractAssets[0];

      let statusClass = styles.statusBadgeLoading;
      let statusText = 'Processing...';
      if (textractAsset.status === 'COMPLETED') {
        statusClass = styles.statusBadgeCompleted;
        statusText = 'Successfully extracted text';
      } else if (textractAsset.status === 'IN_PROGRESS') {
        statusClass = styles.statusBadgeInProgress;
        statusText = 'Extracting text...';
      } else if (textractAsset.status === 'FAILED') {
        statusClass = styles.statusBadgeFailed;
        statusText = 'Failed to extract text';
      }

      return <span className={statusClass}>{statusText}</span>;
    };

    const BedrockStatusBadge = ({
      assetId,
      assetType,
    }: {
      assetId: string;
      assetType: string;
    }) => {
      if (assetType !== 'DOCUMENT') {
        return null;
      }

      const requestHandler = getRequestHandler();
      const {
        data: bedrockResponse,
        error,
        isLoading,
      } = useSWR<BedrockResponse>(
        `bedrock-response-${assetId}`,
        () => getBedrockResponseForAsset(requestHandler, assetId),
        {
          refreshInterval: 5000,
          revalidateOnFocus: true,
          shouldRetryOnError: true,
          errorRetryInterval: 5000,
        },
      );

      if (isLoading) {
        return (
          <span className={styles.bedrockBadgeLoading}>
            Checking for AI analysis...
          </span>
        );
      }

      if (error) {
        console.log(`No bedrock response found for asset ${assetId}:`, error);
        return (
          <span className={styles.bedrockBadgeLoading}>
            Waiting for AI analysis...
          </span>
        );
      }

      if (!bedrockResponse) {
        return (
          <span className={styles.bedrockBadgeLoading}>
            Waiting for AI analysis...
          </span>
        );
      }

      let statusClass = styles.bedrockBadgeLoading;
      let statusText = 'AI Analysis Pending...';

      if (bedrockResponse.status === 'COMPLETED') {
        statusClass = styles.bedrockBadgeCompleted;
        statusText = 'AI Analysis Complete';
      } else if (bedrockResponse.status === 'PENDING') {
        statusClass = styles.bedrockBadgePending;
        statusText = 'AI Analyzing...';
      } else if (bedrockResponse.status === 'FAILED') {
        statusClass = styles.bedrockBadgeFailed;
        statusText = 'AI Analysis Failed';
      }

      const getDecisionBadge = () => {
        if (bedrockResponse.status !== 'COMPLETED') return null;

        let decisionClass = styles.decisionBadge;
        let decisionText = bedrockResponse.decision;

        switch (bedrockResponse.decision) {
          case 'APPROVE':
            decisionClass += ` ${styles.decisionApprove}`;
            break;
          case 'DENY':
            decisionClass += ` ${styles.decisionDeny}`;
            break;
          case 'ESCALATE':
            decisionClass += ` ${styles.decisionEscalate}`;
            break;
          case 'ERROR':
            decisionClass += ` ${styles.decisionError}`;
            break;
        }

        return <span className={decisionClass}>{decisionText}</span>;
      };

      return (
        <div className={styles.bedrockStatusContainer}>
          <span className={statusClass}>{statusText}</span>
          {getDecisionBadge()}
          {bedrockResponse.status === 'COMPLETED' && (
            <button
              className={styles.detailsButton}
              onClick={() => {
                setSelectedBedrockResponse(bedrockResponse);
                setIsModalOpen(true);
              }}
            >
              Details
            </button>
          )}
        </div>
      );
    };

    const toggleModal = () => {
      setIsModalOpen(!isModalOpen);
      if (isModalOpen) {
        setSelectedBedrockResponse(null);
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
                <div className={styles.assetMainRow}>
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
                      onClick={() =>
                        handleDeleteAsset(asset.assetId, asset.name)
                      }
                      className={styles.deleteButton}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className={styles.statusRow}>
                  <AssetStatusBadge
                    assetId={asset.assetId}
                    assetType={asset.type}
                  />
                </div>
                <div className={styles.statusRow}>
                  <BedrockStatusBadge
                    assetId={asset.assetId}
                    assetType={asset.type}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={isModalOpen} toggle={toggleModal} size="lg">
          <ModalHeader toggle={toggleModal}>AI Analysis Results</ModalHeader>
          <ModalBody>
            {selectedBedrockResponse && (
              <div className={styles.modalContent}>
                <div className={styles.modalSection}>
                  <h5 className={styles.modalSectionTitle}>Decision</h5>
                  <div className={styles.modalField}>
                    <span
                      className={`${styles.decisionBadgeLarge} ${
                        selectedBedrockResponse.decision === 'APPROVE'
                          ? styles.decisionApprove
                          : selectedBedrockResponse.decision === 'DENY'
                          ? styles.decisionDeny
                          : selectedBedrockResponse.decision === 'ESCALATE'
                          ? styles.decisionEscalate
                          : styles.decisionError
                      }`}
                    >
                      {selectedBedrockResponse.decision}
                    </span>
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h5 className={styles.modalSectionTitle}>Reason</h5>
                  <p className={styles.modalText}>
                    {selectedBedrockResponse.reason || 'No reason provided'}
                  </p>
                </div>

                <div className={styles.modalSection}>
                  <h5 className={styles.modalSectionTitle}>Strengths</h5>
                  <p className={styles.modalText}>
                    {selectedBedrockResponse.strengths || 'No strengths listed'}
                  </p>
                </div>

                <div className={styles.modalSection}>
                  <h5 className={styles.modalSectionTitle}>Weaknesses</h5>
                  <p className={styles.modalText}>
                    {selectedBedrockResponse.weaknesses ||
                      'No weaknesses listed'}
                  </p>
                </div>

                <div className={styles.modalSection}>
                  <h5 className={styles.modalSectionTitle}>
                    Additional Information
                  </h5>
                  <div className={styles.modalMetadata}>
                    <div className={styles.metadataItem}>
                      <strong>Job ID:</strong>{' '}
                      <span className={styles.codeText}>
                        {selectedBedrockResponse.jobId}
                      </span>
                    </div>
                    <div className={styles.metadataItem}>
                      <strong>Response ID:</strong>{' '}
                      <span className={styles.codeText}>
                        {selectedBedrockResponse.bedrockResponseId}
                      </span>
                    </div>
                    <div className={styles.metadataItem}>
                      <strong>Asset ID:</strong>{' '}
                      <span className={styles.codeText}>
                        {selectedBedrockResponse.assetId}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={toggleModal}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  },
);

AssetList.displayName = 'AssetList';

export default AssetList;
