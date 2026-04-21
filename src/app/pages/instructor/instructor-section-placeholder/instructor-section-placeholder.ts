import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-instructor-section-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="placeholder-wrap">
      <div class="placeholder-card">
        <h1>{{ sectionTitle }}</h1>
        <p>
          This page is available in the sidebar and will be implemented soon.
        </p>
      </div>
    </section>
  `,
  styles: [`
    .placeholder-wrap {
      min-height: calc(100vh - 2rem);
      padding: 1.5rem;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      background: #f7f8fb;
    }

    .placeholder-card {
      width: min(720px, 100%);
      background: #fff;
      border: 1px solid #e8e9f0;
      border-radius: 14px;
      padding: 1.5rem;
      box-shadow: 0 8px 24px rgba(23, 29, 66, 0.06);
    }

    h1 {
      margin: 0 0 0.75rem;
      font-size: 1.5rem;
      color: #1f2a44;
    }

    p {
      margin: 0;
      color: #5f6b84;
      line-height: 1.5;
    }
  `],
})
export class InstructorSectionPlaceholderComponent {
  sectionTitle = 'Section';

  constructor(private route: ActivatedRoute) {
    this.route.data.subscribe((data) => {
      this.sectionTitle = data['title'] ?? 'Section';
    });
  }
}
