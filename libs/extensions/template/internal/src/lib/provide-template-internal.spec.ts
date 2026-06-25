import { TEMPLATE_SERVICE } from '@sneat/extension-template-contract';
import { ListService } from './services';
import { provideTemplateInternal } from './provide-template-internal';

describe('provideTemplateInternal', () => {
  it('provides ListService and binds it to TEMPLATE_SERVICE', () => {
    const providers = provideTemplateInternal();
    expect(providers).toContain(ListService);
    expect(providers).toContainEqual({
      provide: TEMPLATE_SERVICE,
      useExisting: ListService,
    });
  });
});
