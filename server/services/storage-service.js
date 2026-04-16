const { Storage } = require('@google-cloud/storage');
const config = require('../config');
const { logger } = require('../utils/logger');

const getStorageClient = () => {
  if (config.mediaStorageProvider !== 'gcs' || !config.gcsBucketName) {
    return null;
  }

  const options = {};

  if (config.gcsProjectId) {
    options.projectId = config.gcsProjectId;
  }

  try {
    if (config.gcsCredentialsJson) {
      options.credentials = JSON.parse(config.gcsCredentialsJson);
    } else if (config.gcsCredentialsBase64) {
      options.credentials = JSON.parse(Buffer.from(config.gcsCredentialsBase64, 'base64').toString('utf8'));
    } else if (config.gcsKeyFilename) {
      options.keyFilename = config.gcsKeyFilename;
    }
  } catch (error) {
    logger.error('Failed to initialize Google Cloud Storage credentials', { error });
    return null;
  }

  return new Storage(options);
};

const storageClient = getStorageClient();

const buildPublicUrl = (objectPath) => {
  if (!objectPath) {
    return null;
  }

  if (config.gcsPublicBaseUrl) {
    return `${config.gcsPublicBaseUrl}/${objectPath}`;
  }

  if (config.gcsBucketName) {
    return `https://storage.googleapis.com/${config.gcsBucketName}/${objectPath}`;
  }

  return null;
};

const getStorageStatus = () => ({
  provider: config.mediaStorageProvider,
  configured: Boolean(storageClient && config.gcsBucketName),
  bucketName: config.gcsBucketName || null,
  publicBaseUrl: config.gcsPublicBaseUrl || null,
});

const createSignedUpload = async ({ objectPath, mimeType }) => {
  if (!storageClient || !config.gcsBucketName) {
    return {
      mode: 'metadata-only',
      uploadUrl: null,
      publicUrl: buildPublicUrl(objectPath),
    };
  }

  const bucket = storageClient.bucket(config.gcsBucketName);
  const file = bucket.file(objectPath);
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + config.gcsUploadUrlExpiresSeconds * 1000,
    contentType: mimeType,
  });

  return {
    mode: 'gcs-signed-url',
    uploadUrl,
    publicUrl: buildPublicUrl(objectPath),
  };
};

module.exports = {
  buildPublicUrl,
  createSignedUpload,
  getStorageStatus,
};
