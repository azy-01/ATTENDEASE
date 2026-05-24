import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceComponent } from './attendance';
import { StudentApiService } from '../../../core/data/student-api.service';
import { NotificationService } from '../../../core/data/notification.service';

describe('AttendanceComponent', () => {
  let component: AttendanceComponent;
  let fixture: ComponentFixture<AttendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceComponent],
      providers: [
        {
          provide: StudentApiService,
          useValue: {
            getInstructorSessionsForOwner: () => Promise.resolve([]),
            getInstructorClasses: () => Promise.resolve([]),
            getAuthAccountByEmail: () => Promise.resolve(null),
            hideInstructorSessionFromList: () => Promise.resolve(null),
            hideCompletedSessionsOlderThan: () => Promise.resolve(0),
            findClassMatchingSession: () => null,
            addInstructorSession: (session: unknown) => Promise.resolve(session),
            updateInstructorSession: (_id: string, session: unknown) => Promise.resolve(session),
          },
        },
        {
          provide: NotificationService,
          useValue: { add: () => undefined },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
