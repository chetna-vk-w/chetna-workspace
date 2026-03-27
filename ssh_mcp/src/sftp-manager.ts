const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
import type { SSHConnectionConfig } from './types';
import { Storage } from './storage';

/**
 * SFTP Manager
 * Handles file transfers via SFTP
 *
 * Environment variables:
 * - SFTP_BASE_PATH: Base directory for local files (default: ./sftp-data)
 */
export class SFTPManager {
  private storage: Storage;
  private basePath: string;

  constructor(storage: Storage) {
    this.storage = storage;
    // Get base path from env or use default
    this.basePath = process.env.SFTP_BASE_PATH || './sftp-data';

    // Ensure base directory exists
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Get the configured base path
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Resolve local path (relative paths are resolved from basePath)
   */
  private resolveLocalPath(localPath: string): string {
    if (path.isAbsolute(localPath)) {
      return localPath;
    }
    return path.join(this.basePath, localPath);
  }

  /**
   * Create SFTP connection
   */
  private async createSFTPConnection(connectionId: string): Promise<{ client: any; sftp: any; error?: string }> {
    const config = this.storage.getConnection(connectionId);

    if (!config) {
      return { client: null, sftp: null, error: 'Connection not found' };
    }

    return new Promise((resolve) => {
      const client = new Client();

      const timeout = setTimeout(() => {
        client.end();
        resolve({ client: null, sftp: null, error: 'Connection timeout' });
      }, 15000);

      client.on('ready', () => {
        clearTimeout(timeout);

        client.sftp((err: Error, sftp: any) => {
          if (err) {
            client.end();
            resolve({ client: null, sftp: null, error: `SFTP error: ${err.message}` });
            return;
          }

          resolve({ client, sftp });
        });
      });

      client.on('error', (err: Error) => {
        clearTimeout(timeout);
        resolve({ client: null, sftp: null, error: err.message });
      });

      // Connect
      try {
        const connectConfig: any = {
          host: config.host,
          port: config.port || 22,
          username: config.username,
          readyTimeout: 15000,
        };

        if (config.password) {
          connectConfig.password = config.password;
        } else if (config.privateKey) {
          connectConfig.privateKey = config.privateKey;
          if (config.passphrase) {
            connectConfig.passphrase = config.passphrase;
          }
        } else if (config.privateKeyPath) {
          connectConfig.privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
          if (config.passphrase) {
            connectConfig.passphrase = config.passphrase;
          }
        }

        client.connect(connectConfig);
      } catch (error: any) {
        clearTimeout(timeout);
        resolve({ client: null, sftp: null, error: error.message });
      }
    });
  }

  /**
   * Upload file to remote server
   */
  async upload(
    connectionId: string,
    localPath: string,
    remotePath: string
  ): Promise<{ success: boolean; bytesTransferred?: number; localPath?: string; error?: string }> {
    const resolvedLocalPath = this.resolveLocalPath(localPath);

    // Check local file exists
    if (!fs.existsSync(resolvedLocalPath)) {
      return { success: false, error: `Local file not found: ${resolvedLocalPath}` };
    }

    const { client, sftp, error } = await this.createSFTPConnection(connectionId);
    if (error) {
      return { success: false, error };
    }

    return new Promise((resolve) => {
      const localStats = fs.statSync(resolvedLocalPath);

      sftp.fastPut(resolvedLocalPath, remotePath, {}, (err: Error) => {
        client.end();

        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, bytesTransferred: localStats.size, localPath: resolvedLocalPath });
      });
    });
  }

  /**
   * Download file from remote server
   */
  async download(
    connectionId: string,
    remotePath: string,
    localPath: string
  ): Promise<{ success: boolean; bytesTransferred?: number; localPath?: string; error?: string }> {
    const resolvedLocalPath = this.resolveLocalPath(localPath);

    const { client, sftp, error } = await this.createSFTPConnection(connectionId);
    if (error) {
      return { success: false, error };
    }

    // Ensure local directory exists
    const localDir = path.dirname(resolvedLocalPath);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    return new Promise((resolve) => {
      sftp.fastGet(remotePath, resolvedLocalPath, {}, (err: Error) => {
        if (err) {
          client.end();
          resolve({ success: false, error: err.message });
          return;
        }

        const localStats = fs.statSync(resolvedLocalPath);
        client.end();
        resolve({ success: true, bytesTransferred: localStats.size, localPath: resolvedLocalPath });
      });
    });
  }

  /**
   * List remote directory
   */
  async list(
    connectionId: string,
    remotePath: string
  ): Promise<{
    entries: Array<{
      name: string;
      type: 'file' | 'directory' | 'symlink' | 'other';
      size: number;
      modifyTime: Date;
      permissions: string;
    }>;
    error?: string;
  }> {
    const { client, sftp, error } = await this.createSFTPConnection(connectionId);
    if (error) {
      return { entries: [], error };
    }

    return new Promise((resolve) => {
      sftp.readdir(remotePath, (err: Error, list: any[]) => {
        client.end();

        if (err) {
          resolve({ entries: [], error: err.message });
          return;
        }

        const entries = list.map((item: any) => {
          let type: 'file' | 'directory' | 'symlink' | 'other' = 'other';
          if (item.attrs.isDirectory()) type = 'directory';
          else if (item.attrs.isFile()) type = 'file';
          else if (item.attrs.isSymbolicLink()) type = 'symlink';

          // Convert mode to permission string (e.g., rwxr-xr-x)
          const mode = item.attrs.mode;
          const permissions = this.modeToPermissions(mode);

          return {
            name: item.filename,
            type,
            size: item.attrs.size,
            modifyTime: new Date(item.attrs.mtime * 1000),
            permissions,
          };
        });

        resolve({ entries });
      });
    });
  }

  /**
   * Get file/directory stats
   */
  async stat(
    connectionId: string,
    remotePath: string
  ): Promise<{
    exists: boolean;
    type?: 'file' | 'directory' | 'symlink' | 'other';
    size?: number;
    modifyTime?: Date;
    accessTime?: Date;
    permissions?: string;
    error?: string;
  }> {
    const { client, sftp, error } = await this.createSFTPConnection(connectionId);
    if (error) {
      return { exists: false, error };
    }

    return new Promise((resolve) => {
      sftp.stat(remotePath, (err: Error, stats: any) => {
        client.end();

        if (err) {
          if (err.message.includes('No such file')) {
            resolve({ exists: false });
          } else {
            resolve({ exists: false, error: err.message });
          }
          return;
        }

        let type: 'file' | 'directory' | 'symlink' | 'other' = 'other';
        if (stats.isDirectory()) type = 'directory';
        else if (stats.isFile()) type = 'file';
        else if (stats.isSymbolicLink()) type = 'symlink';

        resolve({
          exists: true,
          type,
          size: stats.size,
          modifyTime: new Date(stats.mtime * 1000),
          accessTime: new Date(stats.atime * 1000),
          permissions: this.modeToPermissions(stats.mode),
        });
      });
    });
  }

  /**
   * Create remote directory
   */
  async mkdir(
    connectionId: string,
    remotePath: string
  ): Promise<{ success: boolean; error?: string }> {
    const { client, sftp, error } = await this.createSFTPConnection(connectionId);
    if (error) {
      return { success: false, error };
    }

    return new Promise((resolve) => {
      sftp.mkdir(remotePath, (err: Error) => {
        client.end();

        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true });
      });
    });
  }

  /**
   * Delete remote file
   */
  async deleteFile(
    connectionId: string,
    remotePath: string
  ): Promise<{ success: boolean; error?: string }> {
    const { client, sftp, error } = await this.createSFTPConnection(connectionId);
    if (error) {
      return { success: false, error };
    }

    return new Promise((resolve) => {
      sftp.unlink(remotePath, (err: Error) => {
        client.end();

        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true });
      });
    });
  }

  /**
   * Delete remote directory
   */
  async deleteDir(
    connectionId: string,
    remotePath: string,
    recursive: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    const { client, sftp, error } = await this.createSFTPConnection(connectionId);
    if (error) {
      return { success: false, error };
    }

    if (recursive) {
      // Recursive delete
      try {
        await this.recursiveDelete(sftp, remotePath);
        client.end();
        return { success: true };
      } catch (err: any) {
        client.end();
        return { success: false, error: err.message };
      }
    }

    return new Promise((resolve) => {
      sftp.rmdir(remotePath, (err: Error) => {
        client.end();

        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true });
      });
    });
  }

  /**
   * Recursive delete helper
   */
  private async recursiveDelete(sftp: any, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (err: Error, stats: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (stats.isDirectory()) {
          // List and delete contents
          sftp.readdir(remotePath, async (err: Error, list: any[]) => {
            if (err) {
              reject(err);
              return;
            }

            try {
              for (const item of list) {
                await this.recursiveDelete(sftp, `${remotePath}/${item.filename}`);
              }

              // Delete empty directory
              sftp.rmdir(remotePath, (err: Error) => {
                if (err) reject(err);
                else resolve();
              });
            } catch (e) {
              reject(e);
            }
          });
        } else {
          // Delete file
          sftp.unlink(remotePath, (err: Error) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }

  /**
   * Convert file mode to permission string
   */
  private modeToPermissions(mode: number): string {
    const perms = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
    const owner = perms[(mode >> 6) & 7];
    const group = perms[(mode >> 3) & 7];
    const other = perms[mode & 7];
    return `${owner}${group}${other}`;
  }
}
