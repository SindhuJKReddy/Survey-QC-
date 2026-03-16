import { EventEmitter, computed, inject, Injectable, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api'; // PrimeNG Message Service
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { CommunicationService } from './communication-service';
import { SignalRService } from './signalr-service';
import { WellboreInfo } from '../models/WellBore/wellBoreInfoModel';
import { SurveyStatus } from '../models/WellBore/surveyStatus';

@Injectable({
  providedIn: 'root'
})
export class CommonService {
  // State Management
  private readonly wellBoreArrSignal = signal<any[]>([]);
  private readonly selectedDashboardLayoutSignal = signal<string>('Card');

  // Filter & Search Properties
  private readonly selectedVendorSignal = signal<string | null>('All Vendors');
  private readonly selectedSurveyTypeSignal = signal(-1);
  private readonly surveyTypeArrSignal = signal<any[]>([]);
  private readonly minFilterByAutoRejectedSurveysSignal = signal<number | null>(null);

  // Event Emitters
  public emitWitsmlStatus = new EventEmitter<boolean>();
  public emitSelectedWellboreId = new EventEmitter<string>();
  public emitSelectedWellboreIdForCharts = new EventEmitter<string>();
  public emitSelectedWellboreIdForReport = new EventEmitter<string>();

  // Configuration
  public readonly showWitsmlConnectionStatusMessageSignal = signal('');
  public readonly facConfigurationSignal = signal<any>({});
  public readonly lastSelectedWellboreIdSignal = signal<string | null>(null);

  private communicationService = inject(CommunicationService);
  private _signalrService = inject(SignalRService);
  private router = inject(Router);
  private _messageService = inject(MessageService);

  public readonly dateRangeFromDataComputed = computed(() => {
    const dates = this.wellBoreArrSignal()
      .map(rig => new Date(rig.lastSurveyReceivedTime))
      .filter(d => !isNaN(d.getTime()));

    if (!dates.length) {
      return { start: null as Date | null, end: null as Date | null };
    }

    return {
      start: new Date(Math.min(...dates.map(d => d.getTime()))),
      end: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  });

  private readonly filteredWellBoreArrComputed = computed(() => {
    let results = [...this.wellBoreArrSignal()];
    const selectedVendor = this.selectedVendorSignal();
    const selectedSurveyType = this.selectedSurveyTypeSignal();
    const { start, end } = this.dateRangeFromDataComputed();
    const minAutoRejected = this.minFilterByAutoRejectedSurveysSignal();

    if (selectedVendor && selectedVendor !== 'All Vendors') {
      results = results.filter(w => w.processSummary?.some((s: any) => s.name === selectedVendor));
    }

    if (selectedSurveyType !== -1) {
      results = results.filter(w => w.processSummary?.some((s: any) => {
        const val = (n: any) => Number(n) || 0;
        switch (selectedSurveyType) {
          case SurveyStatus.Unknown:
            return val(s.totalUnknownSurveys) > 0;
          case SurveyStatus.AutoApproved:
            return val(s.totalAutoApprovedSurveys) > 0;
          case SurveyStatus.AutoRejected:
            return val(s.totalAutoRejectedSurveys) > 0;
          case SurveyStatus.UserApproved:
            return val(s.totalUserApprovedSurveys) > 0;
          case SurveyStatus.UserRejected:
            return val(s.totalUserRejectedSurveys) > 0;
          default:
            return false;
        }
      }));
    }

    if (start || end) {
      results = results.filter(w => {
        const d = new Date(w.lastSurveyReceivedTime);
        return (!start || d >= start) && (!end || d <= end);
      });
    }

    if (minAutoRejected !== null) {
      results = results.filter(w =>
        w.processSummary?.some((s: any) => (Number(s.totalAutoRejectedSurveys) || 0) >= minAutoRejected)
      );
    }

    return results.sort((a, b) => a.wellboreInfo.wellId.value.localeCompare(b.wellboreInfo.wellId.value));
  });

  // Public readonly signal handles for direct signal-based consumption in components.
  public readonly wellBoreArrState = this.wellBoreArrSignal.asReadonly();
  public readonly filteredWellBoreArrState = this.filteredWellBoreArrComputed;
  public readonly selectedDashboardLayoutState = this.selectedDashboardLayoutSignal.asReadonly();
  public readonly wellCount = computed(() => this.filteredWellBoreArrComputed().length);
  public readonly hasActiveFilters = computed(() => {
    return Boolean(
      (this.selectedVendorSignal() && this.selectedVendorSignal() !== 'All Vendors') ||
      this.selectedSurveyTypeSignal() !== -1 ||
      this.minFilterByAutoRejectedSurveysSignal() !== null
    );
  });

  private isWellboreStateSubscriptionInitialized = false;

  constructor() {
    this.initSubscriptions();
    this.lastSelectedWellboreIdSignal.set(localStorage.getItem('lastSelectedWellboreId') || null);
    effect(() => {
      this.filteredWellBoreArrComputed();
    });
  }

  public get wellBoreArr(): any[] {
    return this.wellBoreArrSignal();
  }

  public set wellBoreArr(value: any[]) {
    this.wellBoreArrSignal.set([...(value ?? [])]);
  }

  public get filteredWellBoreArr(): any[] {
    return this.filteredWellBoreArrComputed();
  }

  public get selectedDashboardLayout(): string {
    return this.selectedDashboardLayoutSignal();
  }

  public set selectedDashboardLayout(value: string) {
    this.selectedDashboardLayoutSignal.set(value);
  }

  public get selectedSurveyType(): number {
    return this.selectedSurveyTypeSignal();
  }

  public set selectedSurveyType(value: number) {
    this.selectedSurveyTypeSignal.set(value);
  }

  public get surveyTypeArr(): any[] {
    return this.surveyTypeArrSignal();
  }

  public set surveyTypeArr(value: any[]) {
    this.surveyTypeArrSignal.set([...(value ?? [])]);
  }

  public get minFilterByAutoRejectedSurveys(): number | null {
    return this.minFilterByAutoRejectedSurveysSignal();
  }

  public set minFilterByAutoRejectedSurveys(value: number | null) {
    this.minFilterByAutoRejectedSurveysSignal.set(value);
  }

  public get facConfiguration(): any {
    return this.facConfigurationSignal();
  }

  public set facConfiguration(value: any) {
    this.facConfigurationSignal.set(value ?? {});
  }

  public get lastSelectedWellboreId(): string | null {
    return this.lastSelectedWellboreIdSignal();
  }

  public set lastSelectedWellboreId(value: string | null) {
    this.lastSelectedWellboreIdSignal.set(value);
    if (value) {
      localStorage.setItem('lastSelectedWellboreId', value);
    } else {
      localStorage.removeItem('lastSelectedWellboreId');
    }
  }

  private initSubscriptions(): void {
    this.emitWitsmlStatus.subscribe((isConnected: boolean) => {
      if (isConnected) {
        this.generateSurveyType();
        this.startProcessing();
        this.updateWellBoreState();
        this.showWitsmlConnectionStatusMessageSignal.set('');
      } else {
        this.showWitsmlConnectionStatusMessageSignal.set('WITSML configuration is not set up. Please update and try again.');
      }
    });
  }

  public startProcessing(): void {

    setTimeout(() => showLoader(true, 'Processing Wells'));

    this.communicationService.startProcessing().subscribe({
      next: () => {

        showLoader(false);

        this.getMonitorWellBores();
      },
       error: () => showLoader(false)
    });
  }

  public getMonitorWellBores(): void {

    showLoader(true, ' Fetching Wells...');

    this.communicationService.getMonitoredWellbores().subscribe({
      next: (data: WellboreInfo[]) => {

        showLoader(false);
        
        this.wellBoreArrSignal.set(
          data
            .map(well => this.mapWellData(well))
            .sort((a, b) => a.wellboreInfo.wellId.value.localeCompare(b.wellboreInfo.wellId.value))
        );
      },
      error: () =>  showLoader(false)
    });
  }

  public updateWellBoreState(): void {
    if (this.isWellboreStateSubscriptionInitialized) {
      return;
    }

    this.isWellboreStateSubscriptionInitialized = true;

    this._signalrService.wellboreProcessState.subscribe(id => {
      this.communicationService.getWellboreState(id).subscribe(wellbore => {
        const index = this.wellBoreArrSignal().findIndex(x => x.wellboreInfo.wellboreId.value === id);
        const updated = this.mapWellData(wellbore);

        this.wellBoreArrSignal.update(existing => {
          const next = [...existing];
          if (index > -1) {
            next[index] = updated;
          } else {
            next.push(updated);
          }
          return next;
        });
      });
    });
  }

  private mapWellData(well: any): any {
    return {
      ...well,
      processSummary: this.transformProcessSummary(well.processSummary),
      wellboreInfo: {
        ...well.wellboreInfo,
        serviceCompanyInfos: this.transformServiceCompanyInfos(well.wellboreInfo?.serviceCompanyInfos)
      }
    };
  }

  public transformProcessSummary(summary: any): any[] {
    if (!summary) return [];
    return Object.keys(summary).map(key => ({
      name: key,
      ...summary[key]
    }));
  }


  public transformServiceCompanyInfos(infos: any): any[] {
    if (!infos) return [];

    return Object.keys(infos).map(key => ({
      name: key,
      serviceCompany: infos[key]?.serviceCompany ?? null,
      azimuthReference: infos[key]?.azimuthReference ?? null,
      magneticDeclinationUsed: infos[key]?.magneticDeclinationUsed ?? null,
      gridConvergenceUsed: infos[key]?.gridConvergenceUsed ?? null,
      azimuthVerticalSection: infos[key]?.azimuthVerticalSection ?? null
    }));
  }

  public formatName(name: string): string {
    if (!name) return '';
    return name.replace(/^[^_]+_/, '').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  }

  public generateSurveyType(): void {
  const types = Object.entries(SurveyStatus)
    .filter(([key, value]) => typeof value === 'number')
    .map(([key, value]) => ({ key, value }));

  this.surveyTypeArr = [
    { key: 'All Surveys', value: -1 },
    ...types
  ];
}

  public formatLatitude(lat: any): string {
    if (lat == null) return '-';
    const val = typeof lat === 'string' ? parseFloat(lat) : lat;
    return `${Math.abs(val).toFixed(4)}° ${val >= 0 ? 'N' : 'S'}`;
  }

  public formatLongitude(lon: any): string {
    if (lon == null) return '-';
    const val = typeof lon === 'string' ? parseFloat(lon) : lon;
    return `${Math.abs(val).toFixed(4)}° ${val >= 0 ? 'E' : 'W'}`;
  }

  public getFormattedDateTime(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  public getFormattedDate(date: any): Date | null {
    return date ? new Date(date) : null;
  }

  // Navigation Methods
  public viewWellboreSurveys(id: string): void {
    this.router.navigateByUrl('view-surveys').then(() => {
      this.lastSelectedWellboreId = id;
      this.emitSelectedWellboreId.emit(id);
    });
  }

  public viewWellboreCharts(wellboreId: string): void {
    this.lastSelectedWellboreId = wellboreId;
    this.router.navigateByUrl('view-charts').then(() => {
      this.emitSelectedWellboreIdForCharts.emit(wellboreId);
    });
  }

  public viewWellboreReport(well: any): void {
    this.lastSelectedWellboreId = well?.wellboreInfo?.wellboreId?.value ?? null;
    this.router.navigateByUrl('view-report').then(() => this.emitSelectedWellboreIdForReport.emit(well));
  }

  public showNotification(severity: string, summary: string, detail: string): void {
    
    this._messageService.add({ severity, summary, detail });
  }
}