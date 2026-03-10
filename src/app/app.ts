import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonService } from './services/common-service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  public commonService = inject(CommonService);
  public router = inject(Router);
  // protected readonly title = signal('Test');

  // public isCollapsed: boolean = false;
  // public siderWidth: number = 220;
  // private resizing = false;
  // public id = -1;

  // private router = inject(Router);
  // public commonService = inject(CommonService);

  // ngOnInit(): void {
  //   if (performance.navigation.type === 1) {
  //     this.router.navigate(['/']);
  //   }

  //   this.router.events.subscribe(event => {
  //     if (event instanceof NavigationEnd) {
  //       this.commonService.hideOtherInfo = event.url !== '/';
  //     }
  //   });
  // }

  // startResize(): void {
  //   this.resizing = true;
  // }

  // onSideResize(event: MouseEvent): void {
  //   if (!this.resizing) return;

  //   cancelAnimationFrame(this.id);

  //   this.id = requestAnimationFrame(() => {
  //     this.siderWidth = event.clientX;
  //   });
  // }

  // stopResize(): void {
  //   this.resizing = false;
  // }


  // constructor(
  //   private router: Router,
  //   public commonService: CommonService
  // ) {}

  // ngOnInit(): void {

    /** refresh → go dashboard */
    // if (performance.navigation.type === 1) {
    //   this.router.navigate(['/']);
    // }

    /** hide sidebar for inner pages (same logic as before) */
    // this.router.events.subscribe(event => {
    //   if (event instanceof NavigationEnd) {
    //     this.commonService.hideOtherInfo = event.url !== '/';
    //   }
    // });

  //   get sidebarSize(): number {
  //   if (this.commonService.isSidebarCollapsed || this.commonService.hideOtherInfo) {
  //     return 0;
  //   }
  //   return this.siderWidth;
  // }
  }

  /** collapse handling (same behaviour) */
  


