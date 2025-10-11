import React, {
  ChangeEvent,
  ChangeEventHandler,
  PropsWithChildren,
  useMemo,
  useState,
} from 'react';
import {
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Progress,
} from 'reactstrap';
import styles from './AssetUpload.module.scss';
import axios, { AxiosProgressEvent } from 'axios';
import { Duration } from 'luxon';
import { mean } from 'lodash-es';
import { AssetSignedUrlRequest } from '@baseline/types/asset';
import { toast } from 'react-toastify';

const extractExtensionFromFilename = (fullFilename: string) => {
  const extension = fullFilename.substring(
    fullFilename.lastIndexOf('.'),
    fullFilename.length,
  );
  return extension;
};

const formatFileUrl = (fullFilename: string, excludeRandom?: boolean) => {
  const filename = fullFilename
    .substring(0, fullFilename.lastIndexOf('.'))
    .replace(/[^a-z0-9]/gi, '-');
  const extension = extractExtensionFromFilename(fullFilename);
  const rand = excludeRandom
    ? ''
    : `-${parseInt(`${Math.random() * 99999}`, 10)}`;
  const formattedFilename = `${filename}${rand}${extension}`.toLowerCase();
  return formattedFilename;
};

interface Props {
  uploadPath: string;
  fileName?: string;
  onAssetsUploaded: (key: string, assetName: string) => Promise<void>;
  onAssetDeleted?: () => Promise<void>;
  onModalClosed?: () => void;
  limit?: number;
  accept?: string;
  disabled?: boolean;
  getAssetUploadSignedUrl: (
    fileSignedUrlRequest: AssetSignedUrlRequest,
  ) => Promise<string>;
}

const AssetUpload = (props: PropsWithChildren<Props>) => {
  const {
    uploadPath,
    fileName,
    onAssetsUploaded,
    onAssetDeleted,
    onModalClosed,
    children,
    limit = 1024 * 1024 * 100, // 100MB
    accept = 'image/*',
    disabled,
    getAssetUploadSignedUrl,
  } = props;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [assetName, setAssetName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStartedAt, setUploadStartedAt] = useState<Date>(undefined);
  const [progress, setProgress] = useState<Record<string, number[]>>({});
  const [abortController, setAbortController] = useState(new AbortController());

  const toggle = (hasUploaded?: boolean) => {
    setSelectedFiles([]);
    setAssetName('');
    setProgress({});
    setIsUploading(false);
    setUploadStartedAt(undefined);
    setAbortController(new AbortController());
    setIsModalOpen((open) => !open);
    if (isModalOpen && !hasUploaded) {
      onModalClosed();
    }
  };

  const handleFileInput: ChangeEventHandler<HTMLInputElement> = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  const handleUploadProgress = (
    progressEvent: AxiosProgressEvent,
    key: string,
    partNumber: number = 1,
  ) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total,
    );

    setProgress((existingProgress) => {
      let updatedProgress: number[] = existingProgress[key];

      if (!updatedProgress) {
        updatedProgress = Array(partNumber).fill(0) as number[];
      }

      updatedProgress[partNumber - 1] = percentCompleted;

      return {
        ...existingProgress,
        [key]: updatedProgress,
      };
    });
  };

  const totalProgress = useMemo(() => {
    const value = mean(
      Object.entries(progress).map(([, partsProgress]) => mean(partsProgress)),
    );

    return isNaN(value) ? 0 : value;
  }, [progress]);

  const timeRemaining = useMemo(() => {
    if (totalProgress && uploadStartedAt) {
      const currentTime = new Date();
      const timePassed = currentTime.valueOf() - uploadStartedAt.valueOf();
      const secondsRemaining = Math.round(
        ((timePassed / totalProgress) * 100 - timePassed) / 1000,
      );
      return Duration.fromObject({ seconds: secondsRemaining })
        .rescale()
        .toHuman();
    }

    return 'Calculating...';
  }, [totalProgress, uploadStartedAt]);

  const uploadFile = async (file: File) => {
    let formattedFilename = '';
    if (fileName) {
      const extension = extractExtensionFromFilename(file.name);
      formattedFilename = `${fileName}${extension}`;
    } else {
      formattedFilename = formatFileUrl(file.name, !!fileName);
    }

    const key = uploadPath
      ? `${uploadPath}/${formattedFilename}`
      : formattedFilename;

    const preSignedUrl = await getAssetUploadSignedUrl({ filename: key });

    try {
      await axios.put(preSignedUrl, file, {
        onUploadProgress: (progressEvent: AxiosProgressEvent) =>
          handleUploadProgress(progressEvent, key),
        signal: abortController.signal,
      });
      return key;
    } catch (error) {
      toast.error('Something went wrong while uploading asset');
      throw error; // Re-throw to handle in uploadFiles
    }
  };

  const uploadFiles = async () => {
    setUploadStartedAt(new Date());
    setIsUploading(true);

    try {
      const keys = await Promise.all(selectedFiles.map(uploadFile));

      if (keys.length > 0 && keys[0]) {
        await onAssetsUploaded(keys[0], assetName);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      toggle(true);
    }
  };

  const hasFileOverLimit = useMemo(
    () => selectedFiles.some((selectedFile) => selectedFile.size >= limit),
    [limit, selectedFiles],
  );

  return (
    <div className={styles.fileUpload}>
      <div className={styles.buttons}>
        {children ? (
          <div className={styles.customButton} onClick={() => toggle()}>
            {children}
          </div>
        ) : (
          <button onClick={() => toggle()} disabled={disabled}>
            Upload
          </button>
        )}
        {onAssetDeleted && (
          <button
            onClick={() => {
              void onAssetDeleted();
            }}
            disabled={disabled}
          >
            Delete
          </button>
        )}
      </div>
      <Modal
        isOpen={isModalOpen}
        centered
        size="lg"
        toggle={() => setIsModalOpen(false)}
        contentClassName={styles.content}
      >
        <ModalHeader
          tag="span"
          toggle={() => setIsModalOpen(false)}
          className={styles.header}
        >
          <div className={styles.title}>Upload Asset</div>
        </ModalHeader>
        <ModalBody className={styles.body}>
          <div className={styles.form}>
            <Input
              type="text"
              onChange={(event) => setAssetName(event.currentTarget.value)}
              value={assetName}
              placeholder="Asset Title"
            />
            <Input
              type="file"
              onChange={handleFileInput}
              accept={accept}
              disabled={isUploading}
              multiple={false}
            />
            {isUploading && (
              <div className={styles.status}>
                <Label>Upload Progress</Label>
                <Progress
                  className={styles.progressBar}
                  value={totalProgress}
                />
                {`Estimated time remaining: ${timeRemaining}`}
              </div>
            )}
            {hasFileOverLimit && (
              <div className={styles.error}>
                {`Selected file is too large.  Please select a file is smaller than ${
                  limit / 1024 / 1024
                }MB`}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter className={styles.footer}>
          <div className={styles.buttons}>
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              disabled={!selectedFiles.length || hasFileOverLimit || !assetName}
              onClick={() => {
                void (async () => {
                  await uploadFiles();
                })();
              }}
            >
              Upload
            </button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AssetUpload;
