export const environment = {
  firebase: {
    apiKey: 'AIzaSyA6uFehTqd_V67ak7pZBwwETv6qVe7Zd_4',
    authDomain: 'attendease-e7462.firebaseapp.com',
    projectId: 'attendease-e7462',
    storageBucket: 'attendease-e7462.firebasestorage.app',
    messagingSenderId: '618375349761',
    appId: '1:618375349761:web:700476fb30d941c113a200',
    measurementId: 'G-ECRVHQLBCH'
  },
  accountEmail: {
    appUrl: 'http://localhost:4200',
    /** Gmail addresses to notify when someone self-registers. Leave empty to skip admin email alerts. */
    adminNotifyEmails: [] as string[],
    emailjs: {
      serviceId: 'service_z5mm777',
      templateId: 'template_xdnxlzw',
      publicKey: '8GRr30pQyGaOBpSRF'
    }
  }
};
