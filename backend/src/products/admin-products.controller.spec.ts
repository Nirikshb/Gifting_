import { describe, expect, it } from 'vitest';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { AdminProductsController } from './admin-products.controller';

const GUARDS_METADATA = '__guards__';

function controllerGuards() {
  return (Reflect.getMetadata(GUARDS_METADATA, AdminProductsController) ??
    []) as unknown[];
}

function methodGuards(method: string) {
  const handler = (
    AdminProductsController.prototype as unknown as Record<string, object>
  )[method];

  return (Reflect.getMetadata(GUARDS_METADATA, handler) ?? []) as unknown[];
}

describe('AdminProductsController security', () => {
  it('requires an administrator for every route', () => {
    expect(controllerGuards()).toContain(AdminGuard);
  });

  it('protects writes with the CSRF guard', () => {
    expect(methodGuards('create')).toContain(CsrfGuard);
    expect(methodGuards('update')).toContain(CsrfGuard);
    expect(methodGuards('updateStock')).toContain(CsrfGuard);
    expect(methodGuards('uploadImage')).toContain(CsrfGuard);
  });

  it('leaves read routes without the CSRF guard', () => {
    expect(methodGuards('list')).not.toContain(CsrfGuard);
    expect(methodGuards('stats')).not.toContain(CsrfGuard);
    expect(methodGuards('categories')).not.toContain(CsrfGuard);
    expect(methodGuards('detail')).not.toContain(CsrfGuard);
  });
});
