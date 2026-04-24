import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initializeFirebase } from './app/core/firebase/firebase.config';

initializeFirebase();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
