const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { config } = require('../config');

let storageClient;

function isStorageConfigured() {
  return (
    config.storage.provider === 'gcs' &&
    Boolean(config.storage.bucketName)
  );
}

function getStorageClient() {
  if (!isStorageConfigured()) {
    throw new Error('Google Cloud Storage is not configured.');
  }

  if (!storageClient) {
    const options = {};

    if (config.storage.projectId) {
      options.projectId = config.storage.projectId;
    }

    if (config.storage.keyFilename) {
      options.keyFilename = config.storage.keyFilename;
    }

    storageClient = new Storage(options);
  }

  return storageClient;
}

function sanitizeFileName(fileName) {
  const extension = path.extname(fileName || '').toLowerCase();
  const baseName = path
    .basename(fileName || 'upload', extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${baseName || 'asset'}${extension || '.bin'}`;
}

function buildObjectPath({ productId, fileName }) {
  return [
    'products',
    String(productId),
    `${Date.now()}-${sanitizeFileName(fileName)}`,
  ].join('/');
}

function buildPublicUrl(objectPath) {
  const encodedPath = objectPath
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  if (config.storage.publicBaseUrl) {
    return `${config.storage.publicBaseUrl.replace(/\/+$/, '')}/${encodedPath}`;
  }

  return `https://storage.googleapis.com/${config.storage.bucketName}/${encodedPath}`;
}

async function createUploadUrl({ objectPath, contentType }) {
  const bucket = getStorageClient().bucket(config.storage.bucketName);
  const file = bucket.file(objectPath);
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + config.storage.uploadUrlExpiresSeconds * 1000,
    contentType,
  });

  return uploadUrl;
}

async function objectExists(objectPath) {
  const bucket = getStorageClient().bucket(config.storage.bucketName);
  const [exists] = await bucket.file(objectPath).exists();
  return exists;
}

module.exports = {
  buildObjectPath,
  buildPublicUrl,
  createUploadUrl,
  isStorageConfigured,
  objectExists,
};
