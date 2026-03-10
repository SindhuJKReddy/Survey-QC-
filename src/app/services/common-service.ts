import { EventEmitter, computed, inject, Injectable, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api'; // PrimeNG Message Service
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { CommunicationService } from './communication-service';
import { SignalRService } from './signalr-service';
import { WellboreInfo } from '../models/WellBore/wellBoreInfoModel';
import { SurveyStatus } from '../models/WellBore/surveyStatus';
// import { FacLimit } from '../models/WellBore/FacLimit';
// import { ProcessConfiguration } from '../models/WellBore/ProcessConfiguration';

// declare function showLoader(show: boolean, message?: string): void;

@Injectable({
  providedIn: 'root'
})
export class CommonService {
  // State Management
  private readonly isSidebarCollapsedSignal = signal(false);
  private readonly wellBoreArrSignal = signal<any[]>([]);
  private readonly selectedDashboardLayoutSignal = signal<string>('Card');
  private readonly pieChartStatusSignal = signal(false);
  private readonly isAutoRefreshEnableSignal = signal(false);
  private readonly hideOtherInfoSignal = signal(false);

  // Filter & Search Properties
  private readonly searchTextSignal = signal('');
  private readonly selectedVendorSignal = signal<string | null>('All Vendors');
  private readonly selectedSurveyTypeSignal = signal(-1);
  private readonly surveyTypeArrSignal = signal<any[]>([]);
  private readonly minFilterByAutoRejectedSurveysSignal = signal<number | null>(null);
  // private readonly startDateSignal = signal<Date | null>(new Date());
  // private readonly endDateSignal = signal<Date | null>(new Date());

  // Event Emitters
  public emitPieChartStatus = new EventEmitter<boolean>();
  public emitWitsmlStatus = new EventEmitter<boolean>();
  public emitSelectedWellboreId = new EventEmitter<string>();
  public emitSelectedWellboreIdForCharts = new EventEmitter<string>();
  public emitSelectedWellboreIdForReport = new EventEmitter<string>();
  public emitErrorSummaryReport = new EventEmitter<string>();
  public isFilterApplied = new EventEmitter<boolean>();

  // Configuration
  public readonly showWitsmlConnectionStatusMessageSignal = signal('');
  public readonly facConfigurationSignal = signal<any>({});
  public readonly lastSelectedWellboreIdSignal = signal<string | null>(null);
  public readonly dashboardLayout = ['Card', 'Grid', 'Map'];

  private _communicationService = inject(CommunicationService);
  private _signalrService = inject(SignalRService);
  private _router = inject(Router);
  private _messageService = inject(MessageService);

  private readonly vendorsArrComputed = computed(() => {
    const uniqueVendors = new Set<string>();
    this.wellBoreArrSignal().forEach(well => {
      well.processSummary?.forEach((s: any) => s.name && uniqueVendors.add(s.name));
    });

    return [
      { value: 'All Vendors', label: 'All Vendors' },
      ...Array.from(uniqueVendors).map(name => ({ value: name, label: this.formatName(name) }))
    ];
  });

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
    // const startDate = this.startDateSignal();
    // const endDate = this.endDateSignal();
    const searchText = this.searchTextSignal();
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

    if (searchText) {
      const search = searchText.toLowerCase();
      results = results.filter(w =>
        w.wellboreInfo?.wellboreId?.value?.toLowerCase().includes(search) ||
        w.processSummary?.some((s: any) => s.name.toLowerCase().includes(search))
      );
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
  public readonly vendorsArrState = this.vendorsArrComputed;
  public readonly selectedDashboardLayoutState = this.selectedDashboardLayoutSignal.asReadonly();
  public readonly wellCount = computed(() => this.filteredWellBoreArrComputed().length);
  public readonly hasActiveFilters = computed(() => {
    return Boolean(
      (this.selectedVendorSignal() && this.selectedVendorSignal() !== 'All Vendors') ||
      this.selectedSurveyTypeSignal() !== -1 ||
      this.searchTextSignal().trim() ||
      this.minFilterByAutoRejectedSurveysSignal() !== null
    );
  });

  private isWellboreStateSubscriptionInitialized = false;

  constructor() {
    this.initSubscriptions();
    effect(() => {
      this.filteredWellBoreArrComputed();
      this.isFilterApplied.emit();
    });
  }

  public get isSidebarCollapsed() {
    return this.isSidebarCollapsedSignal();
  }

  public set isSidebarCollapsed(value: boolean) {
    this.isSidebarCollapsedSignal.set(value);
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

  public get pieChartStatus(): boolean {
    return this.pieChartStatusSignal();
  }

  public set pieChartStatus(value: boolean) {
    this.pieChartStatusSignal.set(value);
  }

  public get isAutoRefreshEnable(): boolean {
    return this.isAutoRefreshEnableSignal();
  }

  public set isAutoRefreshEnable(value: boolean) {
    this.isAutoRefreshEnableSignal.set(value);
  }

  public get hideOtherInfo(): boolean {
    return this.hideOtherInfoSignal();
  }

  public set hideOtherInfo(value: boolean) {
    this.hideOtherInfoSignal.set(value);
  }

  public get searchText(): string {
    return this.searchTextSignal();
  }

  public set searchText(value: string) {
    this.searchTextSignal.set(value ?? '');
  }

  public get selectedVendor(): string | null {
    return this.selectedVendorSignal();
  }

  public set selectedVendor(value: string | null) {
    this.selectedVendorSignal.set(value ?? 'All Vendors');
  }

  public get vendorsArr(): any[] {
    return this.vendorsArrComputed();
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

  // public get startDate(): Date | null {
  //   return this.startDateSignal();
  // }

  // public set startDate(value: Date | null) {
  //   this.startDateSignal.set(value);
  // }

  // public get endDate(): Date | null {
  //   return this.endDateSignal();
  // }

  // public set endDate(value: Date | null) {
  //   this.endDateSignal.set(value);
  // }

  public get showWitsmlConnectionStatusMessage(): string {
    return this.showWitsmlConnectionStatusMessageSignal();
  }

  public set showWitsmlConnectionStatusMessage(value: string) {
    this.showWitsmlConnectionStatusMessageSignal.set(value ?? '');
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
    this._communicationService.startProcessing().subscribe({
      next: () => {
        showLoader(false);
        this.getMonitorWellBores();
      },
      error: () => showLoader(false)
    });
  }

  public getMonitorWellBores(): void {
    showLoader(true, 'Fetching Wells...');
    this._communicationService.getMonitoredWellbores().subscribe({
      next: (data: WellboreInfo[]) => {
        showLoader(false);
        this.wellBoreArrSignal.set(
          data
            .map(well => this.mapWellData(well))
            .sort((a, b) => a.wellboreInfo.wellId.value.localeCompare(b.wellboreInfo.wellId.value))
        );
        // this.updateWellboreData();
      },
      error: () => showLoader(false)
    });
  }

  public updateWellBoreState(): void {
    if (this.isWellboreStateSubscriptionInitialized) {
      return;
    }

    this.isWellboreStateSubscriptionInitialized = true;

    this._signalrService.wellboreProcessState.subscribe(id => {
      this._communicationService.getWellboreState(id).subscribe(wellbore => {
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

        // this.updateWellboreData();
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


  // private updateTimeRange(): void {
  //   const dateRange = this.dateRangeFromDataComputed();
  //   this.startDateSignal.set(dateRange.start);
  //   this.endDateSignal.set(dateRange.end);
  // }

  // public generateSurveyType(): void {
  //   this.surveyTypeArr = [
  //     { key: 'All Surveys', value: -1 },
  //     ...Object.keys(SurveyStatus)
  //       .filter(key => isNaN(Number(key)))
  //       .map(key => ({ key, value: SurveyStatus[key as keyof typeof SurveyStatus] }))
  //   ];
  // }
  public generateSurveyType(): void {
  const types = Object.entries(SurveyStatus)
    .filter(([key, value]) => typeof value === 'number')
    .map(([key, value]) => ({ key, value }));

  this.surveyTypeArr = [
    { key: 'All Surveys', value: -1 },
    ...types
  ];
}

  // public applyFilters(fromUser = false): void {
  //   this.filteredWellBoreArrComputed();
  //   this.isFilterApplied.emit(!fromUser);
  // }

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
    this._router.navigateByUrl('view-surveys').then(() => {
      this.lastSelectedWellboreId = id;
      this.emitSelectedWellboreId.emit(id);
    });
  }

  public viewWellboreCharts(wellboreId: string): void {
    this.lastSelectedWellboreId = wellboreId;
    this._router.navigateByUrl('view-charts').then(() => {
      this.emitSelectedWellboreIdForCharts.emit(wellboreId);
    });
  }

  public viewWellboreReport(well: any): void {
    this.lastSelectedWellboreId = well?.wellboreInfo?.wellboreId?.value ?? null;
    this._router.navigateByUrl('view-report').then(() => this.emitSelectedWellboreIdForReport.emit(well));
  }

  public viewVendorBasedErrorReport(): void {
    this._router.navigateByUrl('view-errorreport-summary').then(() => this.emitErrorSummaryReport.emit());
  }

  public exportToExcel(fileName: string): void {
    const data = this.filteredWellBoreArr.map(well => {
      const summary = well.processSummary?.[0] || {};
      return {
        'Well ID': well.wellboreInfo?.wellboreId?.value,
        'Service Company': well.wellboreInfo?.serviceCompanyInfos?.map((sc: any) => sc.name).join(', '),
        'Last Survey Received': this.getFormattedDateTime(well.lastSurveyReceivedTime),
        'Latitude': this.formatLatitude(well.wellboreInfo.latitude.value),
        'Longitude': this.formatLongitude(well.wellboreInfo.longitude.value),
        'Total Surveys': well.totalSurveys,
        'Auto Approved': summary.totalAutoApprovedSurveys,
        'User Approved': summary.totalUserApprovedSurveys,
        'Auto Rejected': summary.totalAutoRejectedSurveys,
        'Total User Rejected': summary.totalUserRejectedSurveys,
        'Unknown Surveys': summary.totalUnknownSurveys,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = new Array(Object.keys(data[0] || {}).length).fill({ wch: 20 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Wells');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${fileName}.xlsx`);
  }


  public showNotification(severity: string, summary: string, detail: string): void {
    // PrimeNG severity: 'success', 'info', 'warn', 'error'
    this._messageService.add({ severity, summary, detail });
  }
}