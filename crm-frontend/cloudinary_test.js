import { v2 as cloudinary } from 'cloudinary';

// 1. Configure Cloudinary inline with the collected credentials
cloudinary.config({
  cloud_name: 'doxa4sprm',
  api_key: '677993652613771',
  api_secret: 'SCG7XBJoXtCwzVieQcobY386Ye8'
});

async function run() {
  try {
    const sampleImageUrl = 'https://res.cloudinary.com/demo/image/upload/dog.jpg';
    
    console.log('Uploading sample image...');
    
    // 2. Upload an image from Cloudinary's demo domain
    const uploadResult = await cloudinary.uploader.upload(sampleImageUrl);
    console.log('Secure URL:', uploadResult.secure_url);
    console.log('Public ID:', uploadResult.public_id);
    
    // 3. Get image details and print metadata
    console.log('\nImage Details:');
    console.log('Width:', uploadResult.width);
    console.log('Height:', uploadResult.height);
    console.log('Format:', uploadResult.format);
    console.log('File size (bytes):', uploadResult.bytes);
    
    // 4. Transform the image
    // f_auto: automatically delivers the image in the best format for the user's browser (e.g. WebP/AVIF).
    // q_auto: automatically adjusts image compression/quality to balance file size and visual quality.
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto',
      secure: true
    });
    
    console.log('\nDone! Click link below to see optimized version of the image. Check the size and the format.');
    console.log(transformedUrl);
    
  } catch (error) {
    console.error('Error during Cloudinary onboarding flow:', error);
  }
}

run();
