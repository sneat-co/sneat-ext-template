import { Provider } from '@angular/core';
import { TEMPLATE_SERVICE } from '@sneat/extension-template-contract';
import { ListService } from './services';

// Registers the concrete ListService and binds it to the TEMPLATE_SERVICE token so
// consumers depend only on the ITemplateService contract. Wired in at app bootstrap
// (consumers do not import this factory directly).
export function provideTemplateInternal(): Provider[] {
  return [ListService, { provide: TEMPLATE_SERVICE, useExisting: ListService }];
}
