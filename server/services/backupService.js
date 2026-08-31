const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Performs a complete backup of the MongoDB database using mongodump.
 * The backup is saved as an archive file, overwriting the previous backup.
 */
function performBackup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Backup Service] MONGODB_URI is not defined in environment variables.');
    return;
  }

  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // The file is statically named so it replaces the old one each time
  const backupPath = path.join(backupsDir, 'latest_backup.archive.gz');

  console.log('[Backup Service] Starting database backup...');

  // Enclose URI in quotes to prevent shell issues
  const command = `mongodump --uri="${uri}" --archive="${backupPath}" --gzip`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      if (error.message.includes('not recognized') || error.code === 127) {
        console.log('[Backup Service] mongodump is not installed locally. Skipping automated backup.');
      } else {
        console.error(`[Backup Service] Error executing mongodump: ${error.message}`);
      }
      return;
    }
    console.log(`[Backup Service] Database backup completed successfully at ${new Date().toLocaleString()}`);
  });
}

module.exports = { performBackup };
