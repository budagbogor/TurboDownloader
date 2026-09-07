import fs from 'fs';
import path from 'path';

const gradlewPath = path.join(process.cwd(), 'android', 'gradlew');
try {
  fs.chmodSync(gradlewPath, 0o755);
  console.log('Successfully set executable permissions for gradlew');
} catch (err) {
  console.error('Failed to set permissions:', err.message);
}
