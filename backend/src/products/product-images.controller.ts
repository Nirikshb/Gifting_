import {
  Controller,
  Get,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { join } from 'path';
import { getProductImageUploadDirectory } from '../config/product-configuration';
import {
  isSafeProductImageFileName,
  productImageMimeTypeFromFileName,
} from './utils/product-image';

/**
 * Serves uploaded product images. The file name is checked against the
 * server generated pattern, so a request can never reach outside the upload
 * directory.
 */
@Controller('product-images')
export class ProductImagesController {
  constructor(private readonly configService: ConfigService) {}

  @Get(':fileName')
  serve(@Param('fileName') fileName: string): StreamableFile {
    if (!isSafeProductImageFileName(fileName)) {
      throw new NotFoundException('Image not found');
    }

    const contentType = productImageMimeTypeFromFileName(fileName);
    if (!contentType) {
      throw new NotFoundException('Image not found');
    }

    const path = join(
      getProductImageUploadDirectory(this.configService),
      fileName,
    );

    return new StreamableFile(createReadStream(path), { type: contentType });
  }
}
