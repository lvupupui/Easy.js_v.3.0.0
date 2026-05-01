const {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client
} = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const loggerWinston = require('../core/loggerWinston');

class CloudStorageManager {
  constructor(provider = 's3', config = {}) {
    this.provider = provider;
    this.config = config;
    this.client = null;
    this.initialize();
  }

  initialize() {
    switch (this.provider) {
      case 's3':
        this.client = new S3Client({
          region: this.config.region || process.env.AWS_REGION || 'us-east-1',
          credentials: this.config.accessKeyId && this.config.secretAccessKey ? {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey
          } : undefined
        });
        break;
      case 'gcs': {
        const { Storage } = require('@google-cloud/storage');
        this.client = new Storage({
          projectId: this.config.projectId,
          keyFilename: this.config.keyFilename
        });
        break;
      }
      case 'azure': {
        const { BlobServiceClient } = require('@azure/storage-blob');
        this.client = BlobServiceClient.fromConnectionString(
          this.config.connectionString
        );
        break;
      }
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }

    loggerWinston.info(`Cloud storage initialized: ${this.provider}`);
  }

  async uploadFile(fileBuffer, key, options = {}) {
    try {
      let result;

      if (this.provider === 's3') {
        result = await new Upload({
          client: this.client,
          params: {
            Bucket: this.config.bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: options.contentType || 'application/octet-stream',
            Metadata: options.metadata
          }
        }).done();
      } else if (this.provider === 'gcs') {
        const bucket = this.client.bucket(this.config.bucket);
        result = await bucket.file(key).save(fileBuffer, {
          metadata: { contentType: options.contentType }
        });
      } else if (this.provider === 'azure') {
        const container = this.client.getContainerClient(this.config.container);
        result = await container.getBlockBlobClient(key).upload(fileBuffer, fileBuffer.length, {
          blobHTTPHeaders: { blobContentType: options.contentType }
        });
      }

      loggerWinston.info(`File uploaded: ${key}`, { provider: this.provider });
      return { key, url: this.getFileUrl(key), ...result };
    } catch (error) {
      loggerWinston.error(`Upload failed: ${key}`, { error: error.message });
      throw error;
    }
  }

  async downloadFile(key) {
    try {
      let data;
      if (this.provider === 's3') {
        const result = await this.client.send(new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        }));
        data = result.Body;
      } else if (this.provider === 'gcs') {
        const bucket = this.client.bucket(this.config.bucket);
        const [data_] = await bucket.file(key).download();
        data = data_;
      } else if (this.provider === 'azure') {
        const container = this.client.getContainerClient(this.config.container);
        const downloadResponse = await container.getBlockBlobClient(key).download();
        data = downloadResponse.readableStreamBody;
      }

      loggerWinston.info(`File downloaded: ${key}`);
      return data;
    } catch (error) {
      loggerWinston.error(`Download failed: ${key}`, { error: error.message });
      throw error;
    }
  }

  async deleteFile(key) {
    try {
      if (this.provider === 's3') {
        await this.client.send(new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        }));
      } else if (this.provider === 'gcs') {
        const bucket = this.client.bucket(this.config.bucket);
        await bucket.file(key).delete();
      } else if (this.provider === 'azure') {
        const container = this.client.getContainerClient(this.config.container);
        await container.getBlockBlobClient(key).delete();
      }

      loggerWinston.info(`File deleted: ${key}`);
      return true;
    } catch (error) {
      loggerWinston.error(`Delete failed: ${key}`, { error: error.message });
      throw error;
    }
  }

  async listFiles(prefix = '', options = {}) {
    try {
      if (this.provider === 's3') {
        const result = await this.client.send(new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: prefix,
          MaxKeys: options.limit || 100
        }));
        return (result.Contents || []).map(obj => ({ key: obj.Key, size: obj.Size }));
      }

      if (this.provider === 'gcs') {
        const bucket = this.client.bucket(this.config.bucket);
        const [files] = await bucket.getFiles({ prefix });
        return files.map(file => ({ key: file.name, size: file.metadata.size }));
      }

      const container = this.client.getContainerClient(this.config.container);
      const files = [];
      for await (const blob of container.listBlobsFlat({ prefix })) {
        files.push({ key: blob.name, size: blob.properties.contentLength });
        if (options.limit && files.length >= options.limit) break;
      }
      return files;
    } catch (error) {
      loggerWinston.error('List files failed', { error: error.message });
      throw error;
    }
  }

  async getSignedUrl(key, expiresIn = 3600) {
    try {
      if (this.provider === 's3') {
        return getSignedUrl(
          this.client,
          new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
          { expiresIn }
        );
      }

      if (this.provider === 'gcs') {
        const bucket = this.client.bucket(this.config.bucket);
        const [url] = await bucket.file(key).getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + expiresIn * 1000
        });
        return url;
      }

      const { StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
      const credential = new StorageSharedKeyCredential(this.config.accountName, this.config.accountKey);
      const sas = generateBlobSASQueryParameters({
        containerName: this.config.container,
        blobName: key,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn: new Date(Date.now() + expiresIn * 1000)
      }, credential).toString();
      return `${this.getFileUrl(key)}?${sas}`;
    } catch (error) {
      loggerWinston.error('Signed URL generation failed', { error: error.message });
      throw error;
    }
  }

  getFileUrl(key) {
    if (this.provider === 's3') {
      return `https://${this.config.bucket}.s3.${this.config.region || 'us-east-1'}.amazonaws.com/${key}`;
    }
    if (this.provider === 'gcs') {
      return `https://storage.googleapis.com/${this.config.bucket}/${key}`;
    }
    return `https://${this.config.accountName}.blob.core.windows.net/${this.config.container}/${key}`;
  }

  async copyFile(sourceKey, destinationKey) {
    try {
      if (this.provider === 's3') {
        await this.client.send(new CopyObjectCommand({
          Bucket: this.config.bucket,
          CopySource: `${this.config.bucket}/${sourceKey}`,
          Key: destinationKey
        }));
      } else if (this.provider === 'gcs') {
        const bucket = this.client.bucket(this.config.bucket);
        await bucket.file(sourceKey).copy(bucket.file(destinationKey));
      } else if (this.provider === 'azure') {
        const container = this.client.getContainerClient(this.config.container);
        const sourceBlob = container.getBlockBlobClient(sourceKey).url;
        await container.getBlockBlobClient(destinationKey).beginCopyFromURL(sourceBlob);
      }

      loggerWinston.info(`File copied: ${sourceKey} -> ${destinationKey}`);
      return true;
    } catch (error) {
      loggerWinston.error('Copy failed', { error: error.message });
      throw error;
    }
  }

  async getFileMetadata(key) {
    try {
      if (this.provider === 's3') {
        const result = await this.client.send(new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        }));
        return {
          size: result.ContentLength,
          contentType: result.ContentType,
          lastModified: result.LastModified
        };
      }

      if (this.provider === 'gcs') {
        const bucket = this.client.bucket(this.config.bucket);
        const [metadata] = await bucket.file(key).getMetadata();
        return {
          size: metadata.size,
          contentType: metadata.contentType,
          lastModified: metadata.updated
        };
      }

      const container = this.client.getContainerClient(this.config.container);
      const properties = await container.getBlockBlobClient(key).getProperties();
      return {
        size: properties.contentLength,
        contentType: properties.contentType,
        lastModified: properties.lastModified
      };
    } catch (error) {
      loggerWinston.error('Get metadata failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = CloudStorageManager;
