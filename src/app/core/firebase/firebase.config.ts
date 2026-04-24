import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { environment } from '../../../environments/environment';

let initialized = false;

export function initializeFirebase(): void {
  if (initialized) {
    return;
  }

  const app = initializeApp(environment.firebase);

  // Analytics is not available in all browser/runtime combinations.
  void isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });

  initialized = true;
}
