import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = signal<boolean>(false);
  isSlowLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  private slowLoadingTimer: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true') {
        this.successMessage.set('Votre compte client a été créé avec succès ! Seul le personnel de l\'entreprise a accès au tableau de bord de gestion.');
      } else if (params['error'] === 'client_access_restricted') {
        this.errorMessage.set('Accès refusé : Les comptes CLIENT n\'ont pas accès au tableau de bord de gestion d\'entreprise.');
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.isSlowLoading.set(false);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Détecte si le backend est en démarrage (ex: sortie de veille Render)
    this.slowLoadingTimer = setTimeout(() => {
      if (this.isLoading()) {
        this.isSlowLoading.set(true);
      }
    }, 2500);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.clearTimer();
        this.isLoading.set(false);
        this.isSlowLoading.set(false);

        // Seuls les comptes CLIENT sont redirigés/bloqués du tableau de bord de gestion
        if (this.authService.isClient()) {
          this.authService.logout();
          this.errorMessage.set('Accès refusé : Ce compte est un compte Client. Le tableau de bord de gestion est réservé au personnel de l\'entreprise.');
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.clearTimer();
        this.isLoading.set(false);
        this.isSlowLoading.set(false);
        this.errorMessage.set(err.message || 'Email ou mot de passe incorrect');
      }
    });
  }

  private clearTimer(): void {
    if (this.slowLoadingTimer) {
      clearTimeout(this.slowLoadingTimer);
      this.slowLoadingTimer = null;
    }
  }
}
