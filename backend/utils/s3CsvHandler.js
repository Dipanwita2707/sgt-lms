const AWS = require('aws-sdk');
const csv = require('csv-parser');
const { Readable } = require('stream');

class S3CsvHandler {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION
    });
  }

  // Process CSV from S3 object
  async processCsvFromS3(bucket, key, processor) {
    try {
      const params = {
        Bucket: bucket,
        Key: key
      };

      const csvData = await this.s3.getObject(params).promise();
      const csvContent = csvData.Body.toString();
      
      return new Promise((resolve, reject) => {
        const results = [];
        const errors = [];
        let rowCount = 0;

        const stream = Readable.from([csvContent]);
        
        stream
          .pipe(csv())
          .on('data', (row) => {
            try {
              rowCount++;
              const processedRow = processor(row, rowCount);
              if (processedRow) {
                results.push(processedRow);
              }
            } catch (error) {
              errors.push({ row: rowCount, error: error.message, data: row });
            }
          })
          .on('end', () => {
            resolve({ 
              results, 
              errors, 
              totalRows: rowCount,
              processedRows: results.length 
            });
          })
          .on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to process CSV from S3: ${error.message}`);
    }
  }

  // Process CSV from multer-s3 file object
  async processCsvFromMulterS3(fileObject, processor) {
    if (!fileObject || !fileObject.key || !fileObject.bucket) {
      throw new Error('Invalid S3 file object');
    }

    return this.processCsvFromS3(fileObject.bucket, fileObject.key, processor);
  }

  // Extract S3 details from req.file when using multer-s3
  getS3DetailsFromReqFile(reqFile) {
    return {
      bucket: reqFile.bucket || process.env.AWS_BUCKET,
      key: reqFile.key,
      location: reqFile.location,
      originalName: reqFile.originalname,
      size: reqFile.size,
      mimetype: reqFile.mimetype
    };
  }

  // Clean up S3 file after processing
  async cleanupS3File(bucket, key) {
    try {
      const params = {
        Bucket: bucket,
        Key: key
      };
      await this.s3.deleteObject(params).promise();
      console.log(`Cleaned up S3 file: ${bucket}/${key}`);
    } catch (error) {
      console.error(`Failed to cleanup S3 file ${bucket}/${key}:`, error.message);
    }
  }
}

module.exports = S3CsvHandler;