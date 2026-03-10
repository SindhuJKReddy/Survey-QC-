import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCharts } from './view-charts';

describe('ViewCharts', () => {
  let component: ViewCharts;
  let fixture: ComponentFixture<ViewCharts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewCharts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewCharts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
