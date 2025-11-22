const fs = require('fs');
const path = require('path');

// Check if google-services.json already exists (local development)
const googleServicesPath = path.join(__dirname, '..', 'google-services.json');

if (fs.existsSync(googleServicesPath)) {
  console.log('✓ google-services.json already exists (local file)');
  process.exit(0);
}

// Check for environment variable (EAS Build)
const base64Content = process.env.GOOGLE_SERVICES_JSON;

if (!base64Content) {
  console.warn('⚠️  GOOGLE_SERVICES_JSON environment variable not set.');
  console.warn('⚠️  This will cause build failure on EAS.');
  console.warn('⚠️  Make sure to upload google-services.json as a file environment variable on EAS.');
  process.exit(0); // Don't fail locally
}

try {
  const decodedContent = Buffer.from(base64Content, 'base64').toString('utf-8');
  fs.writeFileSync(googleServicesPath, decodedContent);
  console.log('✓ google-services.json created successfully from environment variable');
} catch (error) {
  console.error('✗ Failed to decode GOOGLE_SERVICES_JSON:', error.message);
  process.exit(1);
}