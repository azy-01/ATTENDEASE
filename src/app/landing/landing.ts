import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface Student {
  name: string;
  id: string;
  status: 'present' | 'late' | 'absent';
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface AboutCard {
  icon: string;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

export interface ContactForm {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  message: string;
}

export interface Toast {
  message: string;
  color: string;
  shadow: string;
}

export type AuthView = 'login' | 'signup-choose' | 'signup-instructor' | 'signup-student';

export interface LoginForm {
  email: string;
  password: string;
  role: 'instructor' | 'student' | '';
}

export interface InstructorSignup {
  firstName: string;
  lastName: string;
  gmail: string;
  password: string;
  confirmPassword: string;
}

export interface StudentSignup {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface MockCredential {
  role: 'instructor' | 'student';
  email: string;
  password: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class LandingComponent implements OnInit, OnDestroy {
  constructor(private router: Router) { }
  private readonly themeStorageKey = 'attendease-theme';

  // ── Navbar ──────────────────────────────────────────────
  isScrolled = false;
  isMobileMenuOpen = false;
  isDarkMode = false;

  // ── Hero ────────────────────────────────────────────────
  attendanceRate = 94.2;
  presentCount = 156;
  absentCount = 8;

  heroStudents: Student[] = [
    { name: 'Maria Santos', id: 'STU-2024-001', status: 'present' },
    { name: 'Juan Dela Cruz', id: 'STU-2024-002', status: 'late' },
    { name: 'Ana Reyes', id: 'STU-2024-003', status: 'present' },
  ];

  // ── Features ────────────────────────────────────────────
  features: Feature[] = [
    { icon: 'qr', title: 'QR Code Scanning', description: 'Students scan a QR code to mark their attendance instantly. Fast, contactless, and accurate.' },
    { icon: 'clock', title: 'Real-time Tracking', description: "Monitor attendance as it happens. See who's present, late, or absent in real-time." },
    { icon: 'users', title: 'Role-based Dashboards', description: 'Separate dashboards for instructors and students with tailored features for each role.' },
    { icon: 'chart', title: 'Reports & Analytics', description: 'Generate detailed attendance reports with filters, charts, and export to Excel capability.' },
    { icon: 'monitor', title: 'Fully Responsive', description: 'Works perfectly on desktop, tablet, and mobile devices. Take attendance from anywhere.' },
    { icon: 'bell', title: 'Smart Notifications', description: 'Get notified about attendance sessions, missed classes, and important updates.' },
  ];

  // ── About ────────────────────────────────────────────────
  aboutCards: AboutCard[] = [
    { icon: 'target', title: 'Our Mission', description: 'To simplify attendance management for educational institutions, making tracking seamless and accurate.' },
    { icon: 'people', title: 'Built for Everyone', description: 'Designed with both instructors and students in mind, offering role-based dashboards tailored to each user.' },
    { icon: 'shield', title: 'Reliable & Secure', description: 'Your attendance data is securely stored with real-time synchronization across all devices.' },
  ];

  // ── FAQs ─────────────────────────────────────────────────
  faqs: FaqItem[] = [
    { question: 'How does the QR code attendance work?', answer: 'Instructors generate a session-specific QR code from the dashboard. Students scan it using their phone camera or the AttendEase app, and their attendance is recorded instantly with a timestamp.', isOpen: false },
    { question: 'Can I use AttendEase on my phone?', answer: 'Yes! AttendEase is fully responsive and works on all screen sizes. Students can scan QR codes and check their records from any device, while instructors can manage sessions on the go.', isOpen: false },
    { question: 'How are "late" and "absent" statuses determined?', answer: "Instructors set a grace period when starting a session. Scans within that window are marked Present, scans after are marked Late, and students who don't scan are automatically marked Absent when the session closes.", isOpen: false },
    { question: 'Can I export attendance records?', answer: 'Absolutely. You can export attendance data to Excel (.xlsx) or CSV format with customizable date ranges and filters. PDF summary reports are also available.', isOpen: false },
    { question: 'Is my data secure?', answer: "Yes. All data is encrypted in transit and at rest. We follow industry-standard security practices to ensure your institution's attendance records remain private and protected.", isOpen: false },
    { question: 'What roles are available in the system?', answer: 'AttendEase supports three roles: Administrator (full system access), Instructor (session management and reports), and Student (attendance viewing and QR scanning). Roles can be assigned by the admin.', isOpen: false },
  ];

  // ── Contact ───────────────────────────────────────────────
  contactForm: ContactForm = { firstName: '', lastName: '', email: '', role: '', message: '' };
  roleOptions = ['Instructor', 'Student', 'Administrator'];

  // ── Toast ─────────────────────────────────────────────────
  toast: Toast | null = null;
  private toastTimer: any;

  // ── Auth Modal ────────────────────────────────────────────
  showModal = false;
  authView: AuthView = 'login';

  // Mock credentials for local demo/testing login.
  private readonly mockCredentials: MockCredential[] = [
    { role: 'instructor', email: 'instructor@gmail.com', password: 'Instructor123' },
    { role: 'student', email: 'student@email.com', password: 'Student123' },
    { role: 'student', email: 'student@gmail.com', password: 'Student123' },
  ];

  showLoginPassword = false;
  showPassword = false;
  showConfirmPassword = false;

  loginForm: LoginForm = { email: '', password: '', role: '' };

  instructorForm: InstructorSignup = {
    firstName: '', lastName: '', gmail: '', password: '', confirmPassword: ''
  };

  studentForm: StudentSignup = {
    firstName: '', lastName: '', email: '', password: ''
  };

  sectionOptions = [
    'BSIT-1A', 'BSIT-1B', 'BSIT-2A', 'BSIT-2B',
    'BSIT-3A', 'BSIT-3B', 'BSIT-4A', 'BSIT-4B',
    'BSCS-1A', 'BSCS-2A', 'BSCS-3A', 'BSCS-4A',
  ];

  formErrors: Record<string, string> = {};
  isLoading = false;

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.initializeTheme();
    this.setupScrollReveal();
  }
  ngOnDestroy(): void { if (this.toastTimer) clearTimeout(this.toastTimer); }

  // ── Scroll ────────────────────────────────────────────────
  @HostListener('window:scroll')
  onScroll(): void { this.isScrolled = window.scrollY > 10; }

  @HostListener('window:keydown.escape')
  onEscape(): void { this.closeModal(); }

  // ── Navbar ────────────────────────────────────────────────
  toggleMobileMenu(): void { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu(): void { this.isMobileMenuOpen = false; }
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
  }

  scrollTo(sectionId: string): void {
    this.closeMobileMenu();
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  // ── FAQ ───────────────────────────────────────────────────
  toggleFaq(index: number): void {
    this.faqs.forEach((faq, i) => {
      faq.isOpen = (i === index) ? !faq.isOpen : false;
    });
  }

  // ── Toast ─────────────────────────────────────────────────
  private showToast(message: string, color: string, shadow: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, color, shadow };
    this.toastTimer = setTimeout(() => (this.toast = null), 3500);
  }

  // ── Contact submit ────────────────────────────────────────
  onSubmitContact(): void {
    if (!this.contactForm.email) { alert('Please enter your email address.'); return; }
    this.showToast("✅ Message sent! We'll get back to you soon.", '#10B981', 'rgba(16,185,129,.4)');
    this.contactForm = { firstName: '', lastName: '', email: '', role: '', message: '' };
  }

  getBadgeClass(status: string): string { return `badge badge-${status}`; }

  // ── Auth modal open/close ─────────────────────────────────
  openLogin(): void {
    this.authView = 'login';
    this.resetForms();
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  openSignup(): void {
    this.authView = 'signup-choose';
    this.resetForms();
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    document.body.style.overflow = '';
    this.resetForms();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  setView(view: AuthView): void {
    this.authView = view;
    this.formErrors = {};
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  private resetForms(): void {
    this.formErrors = {};
    this.isLoading = false;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.showLoginPassword = false;
    this.loginForm = { email: '', password: '', role: '' };
    this.instructorForm = { firstName: '', lastName: '', gmail: '', password: '', confirmPassword: '' };
    this.studentForm = { firstName: '', lastName: '', email: '', password: '' };
  }

  // ── Validation ────────────────────────────────────────────
  private isValidGmail(email: string): boolean {
    return /^[^\s@]+@gmail\.com$/.test(email);
  }

  private isValidPassword(pw: string): boolean {
    return pw.length >= 8;
  }

  // ── Login submit ──────────────────────────────────────────
  onLogin(): void {
    this.formErrors = {};
    if (!this.loginForm.role) this.formErrors['role'] = 'Please select a role.';

    if (!this.loginForm.email) this.formErrors['email'] = 'Email is required.';

    if (!this.loginForm.password) this.formErrors['password'] = 'Password is required.';
    if (Object.keys(this.formErrors).length) return;

    const normalizedEmail = this.loginForm.email.trim().toLowerCase();
    const normalizedPassword = this.loginForm.password.trim();
    const matchedUser = this.mockCredentials.find(
      (credential) =>
        credential.role === this.loginForm.role &&
        credential.email.toLowerCase() === normalizedEmail &&
        credential.password === normalizedPassword
    );

    if (!matchedUser) {
      this.formErrors['auth'] = 'Invalid role, email, or password.';
      return;
    }

    this.isLoading = true;
    const role = this.loginForm.role;
    setTimeout(() => {
      this.isLoading = false;
      this.closeModal();
      if (role === 'instructor') {
        this.router.navigate(['/instructor/overview']); // ← navigate to dashboard
      } else {
        this.router.navigate(['/student/overview']);
      }
    }, 1200);
  }

  // ── Instructor signup ─────────────────────────────────────
  onInstructorSignup(): void {
    this.formErrors = {};
    const f = this.instructorForm;
    if (!f.firstName) this.formErrors['firstName'] = 'First name is required.';
    if (!f.lastName) this.formErrors['lastName'] = 'Last name is required.';
    if (!f.gmail) this.formErrors['gmail'] = 'Gmail address is required.';
    else if (!this.isValidGmail(f.gmail)) this.formErrors['gmail'] = 'Please enter a valid @gmail.com address.';
    if (!f.password) this.formErrors['password'] = 'Password is required.';
    else if (!this.isValidPassword(f.password)) this.formErrors['password'] = 'Password must be at least 8 characters.';
    if (!f.confirmPassword) this.formErrors['confirmPassword'] = 'Please confirm your password.';
    else if (f.password !== f.confirmPassword) this.formErrors['confirmPassword'] = 'Passwords do not match.';
    if (Object.keys(this.formErrors).length) return;

    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      this.closeModal();
      this.router.navigate(['/instructor/overview']);
    }, 1200);
  }

  // ── Student signup ────────────────────────────────────────
  onStudentSignup(): void {
    this.formErrors = {};
    const f = this.studentForm;
    if (!f.firstName) this.formErrors['firstName'] = 'First name is required.';
    if (!f.lastName) this.formErrors['lastName'] = 'Last name is required.';
    if (!f.email) this.formErrors['email'] = 'Email is required.';
    if (!f.password) this.formErrors['password'] = 'Password is required.';
    else if (!this.isValidPassword(f.password)) this.formErrors['password'] = 'Password must be at least 8 characters.';
    if (Object.keys(this.formErrors).length) return;

    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      this.closeModal();
      this.showToast(`🎉 Account created! Welcome, ${f.firstName}!`, '#4F46E5', 'rgba(79,70,229,.4)');
    }, 1200);
  }

  // ── Scroll reveal ─────────────────────────────────────────
  private setupScrollReveal(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => (entry.target as HTMLElement).classList.add('visible'), i * 80);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }, 100);
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.themeStorageKey);
    this.isDarkMode = savedTheme === 'dark';
    this.applyTheme();
  }

  private applyTheme(): void {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    localStorage.setItem(this.themeStorageKey, this.isDarkMode ? 'dark' : 'light');
  }
}