import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StudentApiService } from './core/data/student-api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('ATTENDEASE');

  constructor(private readonly studentApi: StudentApiService) {}

  ngOnInit(): void {
    void this.studentApi.ensureDefaultAccounts();
  }
}
