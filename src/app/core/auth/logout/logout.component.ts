import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-logout',
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-gray-600">جاري تسجيل الخروج...</p>
      </div>
    </div>
  `
})
export class LogoutComponent implements OnInit {
  constructor(private authService: AuthService) {
    console.log('LogoutComponent initialized');
  }

  ngOnInit(): void {
    console.log('Starting logout from component...');
    this.authService.logout();
  }
}