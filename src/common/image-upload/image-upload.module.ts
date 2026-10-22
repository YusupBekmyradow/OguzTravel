import { Global, Module, Injectable, InternalServerErrorException } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'image/avif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/json',
  'application/xml',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/rar',
  'application/x-7z-compressed',
  'application/octet-stream',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.bmp',
  '.tiff',
  '.tif',
  '.heic',
  '.heif',
  '.avif',
  '.ico',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
  '.txt',
  '.json',
  '.xml',
  '.zip',
  '.rar',
  '.7z',
]);

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.tiff',
  '.tif',
  '.heic',
  '.heif',
  '.avif',
  '.ico',
]);

@Injectable()
export class ImagesService {
  private readonly folder = 'uploads';

  private get fullUploadPath(): string {
    const fullPath = path.join(process.cwd(), this.folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
  }

  async saveFiles(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];

    const fullPath = this.fullUploadPath;
    const savedFiles: string[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const isImage = file.mimetype.startsWith('image/') || IMAGE_EXTENSIONS.has(ext);

      if (isImage && ext !== '.svg') {
        try {
          const filename = `${uuid()}.webp`;
          const filePath = path.join(fullPath, filename);

          await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(filePath);

          savedFiles.push(`${this.folder}/${filename}`);
          continue;
        } catch (error) {
        }
      }

      const safeExt = ext || '.bin';
      const filename = `${uuid()}${safeExt}`;
      const filePath = path.join(fullPath, filename);

      await fs.promises.writeFile(filePath, file.buffer);
      savedFiles.push(`${this.folder}/${filename}`);
    }

    return savedFiles;
  }

  async saveImages(files: Express.Multer.File[]): Promise<string[]> {
    return this.saveFiles(files);
  }

  deleteFile(fileUrlOrPath: string): boolean {
    if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return false;

    let cleanPath = fileUrlOrPath.trim();
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }

    const fullPath = path.isAbsolute(cleanPath)
      ? cleanPath
      : path.join(process.cwd(), cleanPath);

    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        return true;
      } catch (error) {
        console.error(`Failed to delete file: ${fullPath}`, error);
        return false;
      }
    }
    return false;
  }

  deleteFiles(filePaths: (string | null | undefined)[]): boolean[] {
    if (!filePaths || !Array.isArray(filePaths)) return [];
    return filePaths.filter((p): p is string => Boolean(p)).map((p) => this.deleteFile(p));
  }

  async updateFiles(
    newFiles: Express.Multer.File[],
    oldFilePaths?: string[],
  ): Promise<string[]> {
    if (oldFilePaths && Array.isArray(oldFilePaths) && oldFilePaths.length > 0) {
      this.deleteFiles(oldFilePaths);
    }
    return this.saveFiles(newFiles);
  }
}

@Global()
@Module({
  imports: [
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (
          ALLOWED_MIME_TYPES.has(file.mimetype) ||
          ALLOWED_EXTENSIONS.has(ext) ||
          file.mimetype.startsWith('image/')
        ) {
          cb(null, true);
        } else {
          cb(new Error(`File type not allowed: ${ext || file.mimetype}`), false);
        }
      },
    }),
  ],
  providers: [ImagesService],
  exports: [MulterModule, ImagesService],
})
export class ImageUploadModule { }