import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentApiService } from '../../../core/data/student-api.service';
import { Reports } from './reports';

describe('Reports', () => {
  let component: Reports;
  let fixture: ComponentFixture<Reports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        {
          provide: StudentApiService,
          useValue: {
            getAttendanceRecords: () => Promise.resolve([]),
            getAuthAccountByEmail: () => Promise.resolve(null),
            getInstructorClasses: () => Promise.resolve([]),
            getInstructorStudents: () => Promise.resolve([]),
          },
        },
      ],
    }).compileComponents();

    localStorage.setItem(
      'attendease-auth-session',
      JSON.stringify({ role: 'instructor', email: 'new@example.com' })
    );

    fixture = TestBed.createComponent(Reports);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.removeItem('attendease-auth-session');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
