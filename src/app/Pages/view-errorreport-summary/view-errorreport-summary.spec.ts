import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewErrorreportSummary } from './view-errorreport-summary';

describe('ViewErrorreportSummary', () => {
  let component: ViewErrorreportSummary;
  let fixture: ComponentFixture<ViewErrorreportSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewErrorreportSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewErrorreportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
