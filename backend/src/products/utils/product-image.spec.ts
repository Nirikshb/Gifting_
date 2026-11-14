import { describe, expect, it } from 'vitest';
import {
  buildProductImageFileName,
  buildProductImageUrl,
  detectProductImageMimeType,
  isSafeProductImageFileName,
  productImageMimeTypeFromFileName,
  sanitizeOriginalFileName,
} from './product-image';

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

function bufferWith(header: Buffer, filler = 32) {
  return Buffer.concat([header, Buffer.alloc(filler, 0x11)]);
}

describe('product image helpers', () => {
  describe('detectProductImageMimeType', () => {
    it('detects png, jpeg, gif and webp from the file signature', () => {
      expect(detectProductImageMimeType(bufferWith(PNG_HEADER))).toBe(
        'image/png',
      );
      expect(detectProductImageMimeType(bufferWith(JPEG_HEADER))).toBe(
        'image/jpeg',
      );
      expect(
        detectProductImageMimeType(bufferWith(Buffer.from('GIF89a', 'ascii'))),
      ).toBe('image/gif');
      expect(
        detectProductImageMimeType(bufferWith(Buffer.from('RIFF', 'ascii'), 4)),
      ).toBeNull();
    });

    it('detects webp and avif containers', () => {
      const webp = Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        Buffer.alloc(4, 0),
        Buffer.from('WEBP', 'ascii'),
        Buffer.alloc(8, 0),
      ]);
      const avif = Buffer.concat([
        Buffer.alloc(4, 0),
        Buffer.from('ftyp', 'ascii'),
        Buffer.from('avif', 'ascii'),
        Buffer.alloc(8, 0),
      ]);

      expect(detectProductImageMimeType(webp)).toBe('image/webp');
      expect(detectProductImageMimeType(avif)).toBe('image/avif');
    });

    it('rejects content that is not an image', () => {
      expect(
        detectProductImageMimeType(Buffer.from('MZ executable', 'ascii')),
      ).toBeNull();
      expect(detectProductImageMimeType(Buffer.alloc(0))).toBeNull();
    });
  });

  describe('file names', () => {
    it('generates a server side file name with the matching extension', () => {
      const name = buildProductImageFileName('image/png');

      expect(name.endsWith('.png')).toBe(true);
      expect(isSafeProductImageFileName(name)).toBe(true);
    });

    it('rejects names that do not come from the server', () => {
      expect(isSafeProductImageFileName('../../secret.png')).toBe(false);
      expect(isSafeProductImageFileName('image.png')).toBe(false);
      expect(isSafeProductImageFileName('a'.repeat(36) + '.png')).toBe(false);
    });

    it('keeps only the file name of an uploaded path', () => {
      expect(sanitizeOriginalFileName('../../etc/passwd')).toBe('passwd');
      expect(sanitizeOriginalFileName('C:\\photos\\gift box.png')).toBe(
        'gift box.png',
      );
      expect(sanitizeOriginalFileName('   ')).toBe('image');
    });
  });

  describe('urls', () => {
    it('builds a public url on the storefront origin', () => {
      const name = buildProductImageFileName('image/jpeg');

      expect(buildProductImageUrl('http://localhost:4000', name)).toBe(
        `http://localhost:4000/api/product-images/${name}`,
      );
      expect(buildProductImageUrl('http://localhost:4000/', name)).toBe(
        `http://localhost:4000/api/product-images/${name}`,
      );
    });

    it('maps a stored file back to its content type', () => {
      expect(productImageMimeTypeFromFileName('a.jpg')).toBe('image/jpeg');
      expect(productImageMimeTypeFromFileName('a.png')).toBe('image/png');
      expect(productImageMimeTypeFromFileName('a.exe')).toBeNull();
    });
  });
});
