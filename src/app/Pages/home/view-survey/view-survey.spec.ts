import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewSurvey } from './view-survey';

describe('ViewSurvey', () => {
  let component: ViewSurvey;
  let fixture: ComponentFixture<ViewSurvey>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewSurvey]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewSurvey);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
