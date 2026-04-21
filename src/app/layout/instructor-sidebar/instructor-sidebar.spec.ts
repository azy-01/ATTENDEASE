import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstructorSidebar } from './instructor-sidebar';

describe('InstructorSidebar', () => {
  let component: InstructorSidebar;
  let fixture: ComponentFixture<InstructorSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstructorSidebar],
    }).compileComponents();

    fixture = TestBed.createComponent(InstructorSidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
