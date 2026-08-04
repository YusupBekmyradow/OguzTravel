import { Global, Module, InternalServerErrorException } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { Injectable } from '@nestjs/common';
import * as multer from 'multer';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ImagesService {
  async saveImages(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];

    const folder = 'uploads';
    const fullPath = path.join(process.cwd(), folder);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    try {
      const savedImages: string[] = [];
      for (const file of files) {
        const filename = `${uuid()}.webp`;
        const filePath = path.join(fullPath, filename);

        await sharp(file.buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filePath);

        savedImages.push(`${folder}/${filename}`);
      }
      return savedImages;
    } catch (error) {
      throw new InternalServerErrorException('Image processing failed');
    }
  }
}

@Global()
@Module({
  imports: [
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files allowed'), false);
        }
        cb(null, true);
      },
    }),
  ],
  providers: [ImagesService],
  exports: [MulterModule, ImagesService],
})
export class ImageUploadModule {}