import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorSummaryCharts } from './error-summary-charts';

describe('ErrorSummaryCharts', () => {
  let component: ErrorSummaryCharts;
  let fixture: ComponentFixture<ErrorSummaryCharts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorSummaryCharts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ErrorSummaryCharts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
