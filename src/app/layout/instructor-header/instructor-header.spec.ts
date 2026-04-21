import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstructorHeader } from './instructor-header';

describe('InstructorHeader', () => {
  let component: InstructorHeader;
  let fixture: ComponentFixture<InstructorHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstructorHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(InstructorHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
