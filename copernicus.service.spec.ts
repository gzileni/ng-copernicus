import { TestBed } from '@angular/core/testing';

import { CopernicusService } from './copernicus.service';

describe('CopernicusService', () => {
  let service: CopernicusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CopernicusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
