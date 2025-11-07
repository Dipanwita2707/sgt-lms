const S3Service = require('./services/s3Service');
require('dotenv').config();

async function testS3Connection() {
  console.log('🧪 Testing S3 Connection...');
  console.log(`📦 Bucket: ${process.env.AWS_BUCKET}`);
  console.log(`🌍 Region: ${process.env.AWS_REGION}`);
  
  try {
    const s3Service = new S3Service();
    
    // Create a simple test file
    const testContent = `S3 Test File - Generated at ${new Date().toISOString()}`;
    const testFile = {
      buffer: Buffer.from(testContent),
      originalname: 'test-file.txt',
      mimetype: 'text/plain'
    };
    
    console.log('⬆️ Uploading test file to S3...');
    const result = await s3Service.uploadFile(testFile, 'test');
    
    if (result.success) {
      console.log('✅ S3 Upload Successful!');
      console.log(`📍 File URL: ${result.url}`);
      console.log(`🔑 S3 Key: ${result.key}`);
      
      // Test delete
      console.log('🗑️ Cleaning up test file...');
      await s3Service.deleteFile(result.key);
      console.log('✅ Test file deleted successfully!');
      
      console.log('\n🎉 S3 Configuration is working correctly!');
      console.log('✅ All file uploads will now go to your S3 bucket: ' + process.env.AWS_BUCKET);
      
    } else {
      console.log('❌ S3 Upload Failed');
    }
    
  } catch (error) {
    console.error('❌ S3 Test Failed:', error.message);
    console.log('\n🔧 Please check your configuration:');
    console.log('1. Verify AWS credentials in .env file');
    console.log('2. Ensure S3 bucket exists and is accessible');
    console.log('3. Check AWS region is correct');
    console.log('4. Verify bucket permissions allow read/write operations');
  }
}

// Run test
testS3Connection();