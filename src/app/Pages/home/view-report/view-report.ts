import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { NGX_ECHARTS_CONFIG, NgxEchartsModule } from 'ngx-echarts';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import type { EChartsType } from 'echarts/core';
import { PopoverModule } from 'primeng/popover';
import { MenuModule } from 'primeng/menu';

import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';

import html2pdf from 'html2pdf.js';
import { CommonService } from '../../../services/common-service';
import { CommunicationService } from '../../../services/communication-service';
import { SurveyStatus } from '../../../models/WellBore/surveyStatus';
import { ScrollerModule } from 'primeng/scroller';
import { TooltipModule } from 'primeng/tooltip';
import { OverlayModule } from 'primeng/overlay';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-report',
  imports: [
    CommonModule,
    FormsModule,
    NgxEchartsModule,
    ToolbarModule,
    ButtonModule,
    MenuModule,
    TableModule,
    CheckboxModule,
    ScrollerModule,
    TooltipModule,
    PopoverModule,
    OverlayModule
  ],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts }
    }
  ],
  templateUrl: './view-report.html',
  styleUrl: './view-report.css',
})
export class ViewReport implements OnInit {

  private readonly REPORT_WELLBORE_ID_KEY = 'reportSelectedWellboreId';

  public wellBoreRequestResponse: any[] = [];
  public wellDataForPdf: any = null;
  public wellBoreDataForPdf: any[] = [];
  public filteredWellBoreDataForPdf: any[] = [];
  public wellboreSurveyHeadersForPdf: any[] = [];
  public dateForPrintView: Date = new Date();
  public originalWellBoreDataForCharts: any;
  public wellBoreDataForPdfData: Array<{
    isVisible: boolean;
    name: string;
    xAxisName: string;
    yAxisName: string;
    series: Array<{
      name: string;
      type: string;
      color: string;
      data: Array<{ x: string | number; y: number }>;
    }>;
  }> = [];
  chartOptionsForPdf: EChartsOption[] = [];
  chartOptionsForPdfInstances: EChartsType[] = [];
  chartDataArray: any[] = [];
  chartDataArrayForPdf: any[] = [];
  public selectedAzimuthType: number = 2;
  public reportVisibleArr: any[] = []
  public reportSettingItems: MenuItem[] = [];
  public isReportSettingsOpen = false;

  public commonService = inject(CommonService);
  private _communicationService = inject(CommunicationService);
  private _router = inject(Router);

  get reportWellLabel(): string {
    const info = this.wellDataForPdf?.wellboreInfo;
    const wellId = info?.wellId?.value;
    return wellId ? `${wellId} - Report` : 'Well Report';
  }

  goBackToHome(): void {
    this._router.navigateByUrl('');
  }

  public toggleReportSettings(event: MouseEvent): void {
    event.stopPropagation();
    this.isReportSettingsOpen = !this.isReportSettingsOpen;
  }

  public onReportSettingToggle(setting: { isVisible: boolean }, event?: MouseEvent): void {
    event?.stopPropagation();
    setting.isVisible = !setting.isVisible;
    this.buildReportSettingItems();
    this.generateChartOptionsForPdf();
  }

  @HostListener('document:click')
  public closeReportSettingsOnOutsideClick(): void {
    this.isReportSettingsOpen = false;
  }

  ngOnInit(): void {
    this.commonService.emitSelectedWellboreIdForReport.subscribe(data => {
      if (typeof data === 'string') {
        this.loadReportByWellboreId(data);
      } else {
        this.viewPdfReportDrawer(data);
      }
    });

    this.restoreReportSelection();
  }

  private restoreReportSelection(): void {
    if (this.wellDataForPdf) {
      return;
    }

    const selectedWellboreId = this.commonService.lastSelectedWellboreId
      || sessionStorage.getItem(this.REPORT_WELLBORE_ID_KEY);

    if (!selectedWellboreId) {
      return;
    }

    const selectedWell = this.commonService.wellBoreArr.find(
      (well: any) => well?.wellboreInfo?.wellboreId?.value === selectedWellboreId
    );

    if (selectedWell) {
      this.viewPdfReportDrawer(selectedWell);
      return;
    }

    this.loadReportByWellboreId(selectedWellboreId);
  }

  private loadReportByWellboreId(wellboreId: string): void {
    if (!wellboreId) {
      return;
    }

    this.commonService.lastSelectedWellboreId = wellboreId;
    sessionStorage.setItem(this.REPORT_WELLBORE_ID_KEY, wellboreId);

    const selectedWell = this.commonService.wellBoreArr.find(
      (well: any) => well?.wellboreInfo?.wellboreId?.value === wellboreId
    );

    if (selectedWell) {
      this.viewPdfReportDrawer(selectedWell);
      return;
    }

    this._communicationService.getMonitoredWellbores().subscribe((wells: any[]) => {
      const matchedWell = wells?.find((well: any) => well?.wellboreInfo?.wellboreId?.value === wellboreId);
      if (!matchedWell) {
        return;
      }

      const mappedWell = {
        ...matchedWell,
        processSummary: this.commonService.transformProcessSummary(matchedWell.processSummary),
        wellboreInfo: {
          ...matchedWell.wellboreInfo,
          serviceCompanyInfos: this.commonService.transformServiceCompanyInfos(matchedWell.wellboreInfo?.serviceCompanyInfos)
        }
      };

      this.viewPdfReportDrawer(mappedWell);
    });
  }

  viewPdfReportDrawer(well: any): void {
    if (!well?.wellboreInfo?.wellboreId?.value) {
      return;
    }
    this.commonService.lastSelectedWellboreId = well.wellboreInfo.wellboreId.value;
    sessionStorage.setItem(this.REPORT_WELLBORE_ID_KEY, well.wellboreInfo.wellboreId.value);
    this.wellDataForPdf = well;
    const wellId = well.wellboreInfo.wellboreId.value;

    const loadReportData = () => this.wellBoreDataForPdfReport(wellId);

    if (this.hasFacLimits()) {
      loadReportData();
      return;
    }

    this._communicationService.getFacLimits().subscribe({
      next: (limits: any) => {
        if (limits) {
          this.commonService.facConfiguration = limits;
        }
        loadReportData();
      },
      error: () => {
        loadReportData();
      }
    });
  }

  private hasFacLimits(): boolean {
    const config = this.commonService.facConfiguration;
    return Boolean(
      config?.azimuthQCLimits &&
      config?.gTotalQCLimits &&
      config?.inclinationQCLimits &&
      config?.dipQCLimits &&
      config?.bTotalQCLimits
    );
  }

  wellBoreDataForPdfReport(wellboreId: string): void {
    showLoader(true, 'Loading Report')

    this._communicationService.getWellboreSurveys(wellboreId).subscribe(data => {
      showLoader(false);

      this.wellBoreRequestResponse = data?.wellboreSurveys
      if (!data?.wellboreSurveys?.length) {
        this.wellBoreDataForPdf = [];
        this.filteredWellBoreDataForPdf = [];
        this.wellBoreDataForPdfData = []
        this.wellboreSurveyHeadersForPdf = [];
        return;
      }

      this.originalWellBoreDataForCharts = data
      // this.wellBoreDataForPdfData = data;

      const seenDepths = new Set();
      this.wellBoreDataForPdf = data.wellboreSurveys.map((item: any) => ({
        surveyStatus: SurveyStatus[item.surveyStatus],
        gravAxialRaw: item.gravAxialRaw?.value?.toFixed(2),
        gravTran1Raw: item.gravTran1Raw?.value?.toFixed(2),
        gravTran2Raw: item.gravTran2Raw?.value?.toFixed(2),
        magAxialRaw: item.magAxialRaw?.value?.toFixed(2),
        magTran1Raw: item.magTran1Raw?.value?.toFixed(2),
        magTran2Raw: item.magTran2Raw?.value?.toFixed(2),
        serviceCompany: this.getAllServiceCompanyNames(item.logName.value),
        calculatedAzimuth: item.calculatedAzimuth?.value?.toFixed(2) ?? this.getLastNonNullValue('calculatedAzimuth'),
        measuredDepth: item.measuredDepth?.value?.toFixed(2) ?? this.getLastNonNullValue('measuredDepth'),
        inclination: item.inclination?.value?.toFixed(2) ?? this.getLastNonNullValue('inclination'),
        calculatedInclination: item.calculatedInclination?.value?.toFixed(2) ?? this.getLastNonNullValue('calculatedInclination'),
        azimuth: item.azimuth?.value?.toFixed(2) ?? this.getLastNonNullValue('azimuth'),
        gravTotalFieldCalc: item.gravTotalFieldCalc?.value?.toFixed(2) ?? this.getLastNonNullValue('gravTotalFieldCalc'),
        gravTotalFieldReference: item.gravTotalFieldReference?.value?.toFixed(2) ?? this.getLastNonNullValue('gravTotalFieldReference'),
        magDipAngleCalc: item.magDipAngleCalc?.value?.toFixed(2) ?? this.getLastNonNullValue('magDipAngleCalc'),
        magDipAngleReference: item.magDipAngleReference?.value?.toFixed(2) ?? this.getLastNonNullValue('magDipAngleReference'),
        magTotalFieldCalc: item.magTotalFieldCalc?.value?.toFixed(2) ?? this.getLastNonNullValue('magTotalFieldCalc'),
        magTotalFieldReference: item.magTotalFieldReference?.value?.toFixed(2) ?? this.getLastNonNullValue('magTotalFieldReference'),
        deltaAzimuth: item.deltaAzimuth?.value?.toFixed(2) ?? this.getLastNonNullValue('deltaAzimuth'),
        deltaGravTotalField: item.deltaGravTotalField?.value?.toFixed(2) ?? this.getLastNonNullValue('deltaGravTotalField'),
        deltaInclination: item.deltaInclination?.value?.toFixed(2) ?? this.getLastNonNullValue('deltaInclination'),
        deltaMagDipAngle: item.deltaMagDipAngle?.value?.toFixed(2) ?? this.getLastNonNullValue('deltaMagDipAngle'),
        deltaMagTotalField: item.deltaMagTotalField?.value?.toFixed(2) ?? this.getLastNonNullValue('deltaMagTotalField'),
        toolCode: item.toolCode?.value,
        iFR1LongCollarAzimuth: item.ifR1LongCollarAzimuth?.value?.toFixed(2),
        iFR1ShortCollarAzimuth: item.ifR1ShortCollarAzimuth?.value?.toFixed(2),
        deltaAzimuthTaget: this.commonService.facConfiguration?.azimuthQCLimits?.threshold ?? 0,
        deltaGravTotalTaget: this.commonService.facConfiguration?.gTotalQCLimits?.threshold ?? 0,
        deltaInclinationTarget: this.commonService.facConfiguration?.inclinationQCLimits?.threshold ?? 0,
        deltaMagDipAngleTarget: this.commonService.facConfiguration?.dipQCLimits?.threshold ?? 0,
        deltaMagTotalFieldTarget: this.commonService.facConfiguration?.bTotalQCLimits?.threshold ?? 0,
      }))
        .filter((item: any) => {
          if (item.measuredDepth === null || seenDepths.has(item.measuredDepth)) {
            return false;
          }
          seenDepths.add(item.measuredDepth);
          return true;
        })
        .sort((a: any, b: any) => (a.measuredDepth ?? 0) - (b.measuredDepth ?? 0)); // Sort by measured depth

      this.wellboreSurveyHeadersForPdf = [
        { key: 'surveyStatus', label: 'Survey Status', width: '200px' },
        { key: 'serviceCompany', label: 'Survey Company', width: '120px' },
        { key: 'gravAxialRaw', label: 'Grav Axial Raw', unit: this.getUnit('gravAxialRaw'), width: '120px' },
        { key: 'gravTran1Raw', label: 'Grav Tran1 Raw', unit: this.getUnit('gravTran1Raw'), width: '120px' },
        { key: 'gravTran2Raw', label: 'Grav Tran2 Raw', unit: this.getUnit('gravTran2Raw'), width: '120px' },
        { key: 'magAxialRaw', label: 'Mag Axial Raw', unit: this.getUnit('magAxialRaw'), width: '120px' },
        { key: 'magTran1Raw', label: 'Mag Tran1 Raw', unit: this.getUnit('magTran1Raw'), width: '120px' },
        { key: 'magTran2Raw', label: 'Mag Tran2 Raw', unit: this.getUnit('magTran2Raw'), width: '120px' },
        { key: 'inclination', label: 'Inclination', unit: this.getUnit('inclination'), width: '120px' },
        { key: 'calculatedInclination', label: 'Calc Inclination', unit: this.getUnit('calculatedInclination'), width: '120px' },
        { key: 'azimuth', label: 'Azimuth', unit: this.getUnit('azimuth'), width: '120px' },
        { key: 'calculatedAzimuth', label: 'Calc Azimuth', unit: this.getUnit('calculatedAzimuth'), width: '120px' },
        { key: 'measuredDepth', label: 'Measured Depth', unit: this.getUnit('measuredDepth'), width: '140px' },
        { key: 'iFR1ShortCollarAzimuth', label: 'IFR1ShortCollar Azimuth', unit: this.getUnit('ifR1ShortCollarAzimuth'), width: '120px' },
        { key: 'iFR1LongCollarAzimuth', label: 'IFR1LongCollar Azimuth', unit: this.getUnit('ifR1LongCollarAzimuth'), width: '120px' },
        { key: 'toolCode', label: 'Tool Code', width: '120px' },
      ];

      this.filteredWellBoreDataForPdf = this.wellBoreDataForPdf
      this.loadSurveyChartDataForPdf()
    });
  }

  getUnit = (key: string): string => {
    const surveys = this.originalWellBoreDataForCharts?.wellboreSurveys ?? [];
    for (const survey of surveys) {
      if (survey?.[key]?.valueUnit) {
        return survey[key].valueUnit;
      }
    }
    return '';
  };

  private getLastNonNullValue(field: string) {
    if (!Array.isArray(this.wellBoreDataForPdf) || this.wellBoreDataForPdf.length === 0) {
      return null;
    }
    for (let i = this.wellBoreDataForPdf.length - 1; i >= 0; i--) {
      const item = this.wellBoreDataForPdf[i];
      if (item && item[field] !== null && item[field] !== undefined) {
        return item[field];
      }
    }
    return null;
  }

  downloadReport(): void {
    const printContent = document.getElementById('into-data');
    const contentStartHeder = document.getElementById('contentStartHeder');
    const surveys = document.getElementById('surveys');
    const disclaimer = document.getElementById('disclaimer');

    let windowContent = '';
    let processedCharts = 0;
    // showLoader(true, 'Downloading Report');

    const allCharts = this.chartOptionsForPdfInstances.map((chartInstance, i) => ({
      dataUrl: chartInstance.getDataURL({ pixelRatio: 4, backgroundColor: '#fff' }),
      name: this.wellBoreDataForPdfData[i]?.name || '',
      isVisible: this.wellBoreDataForPdfData[i]?.isVisible
    }));

    let visibleCharts = allCharts.filter(chart => chart.isVisible);

    if (visibleCharts.length === 0) {
      this.generatePdfReport(printContent, contentStartHeder, windowContent, surveys, disclaimer);
      // showLoader(false);
      return;
    }

    visibleCharts.forEach((chart, i) => {
      if (i % 2 === 0) {
        windowContent += `<div class="a4 break" style="margin-top:3px;display:flex; flex-direction:column;gap:10px;">`;
      }

        windowContent += `
          <div class="pdf-avoid-break" style="width: 100%; border:1px solid #000;margin-bottom:10px;float:left">
            <div class="heading" style="background:${this.commonService?.facConfiguration ? 'var(--report-red, #c70000)' : '#c70000'};color:#fff;padding:4px 8px;border-bottom:1px solid var(--report-red-dark, #930000);">
              <h2 style="margin:0;font-size:12px;font-weight:700;color:#fff;">${chart.name}</h2>
                </div>
                <img src="${chart.dataUrl}" style="width:100%">
            </div>
        `;

      if (i % 2 === 1 || i === visibleCharts.length - 1) {
        windowContent += `</div>`;
      }

      processedCharts++;

      // if (processedCharts === visibleCharts.length) {
      //   this.generatePdfReport(printContent, contentStartHeder, windowContent, surveys, disclaimer);
      //   showLoader(false);
      // }
    });

    this.generatePdfReport(printContent, contentStartHeder, windowContent, surveys, disclaimer);
  }

  allSurveyChartChartForReportInit(chartInstance: EChartsType, index: number) {
    this.chartOptionsForPdfInstances[index] = chartInstance;
  }

  generateChartOptionsForPdf(): void {
    this.chartOptionsForPdf = this.wellBoreDataForPdfData.map((chart: any) => ({
      title: {
        text: chart.name,
        show: false,
        left: 'left',
        textStyle: {
          color: '#000'
        }
      },
      grid: {
        top: '8%',
      },
      legend: {
        data: chart.series.map((s: any) => s.name),
        show: true,
        type: 'scroll',
        orient: 'horizontal',
        right: "0%",
        top: '0',
        textStyle: {
          color: '#000',
        },
        itemWidth: 12,
        itemHeight: 12,
        itemStyle: {
          borderRadius: 6,
          borderWidth: 1,
        },
        icon: 'roundRect'
      },
      xAxis: {
        type: 'category',
        name: chart.xAxisName,
        data: chart.series[0].data.map((d: any) => d.x),
        nameTextStyle: {
          color: '#000',
        },
        axisLine: {
          lineStyle: {
            color: '#000',
          },
        },
        nameLocation: 'middle',
        nameGap: 25,
      },
      yAxis: {
        type: 'value',
        name: chart.yAxisName,
        nameLocation: 'middle',
        nameGap: 55,
        nameTextStyle: {
          color: '#000',
        },
        axisLabel: {
          color: '#000',
        },
        axisLine: {
          lineStyle: {
            color: '#eee',
          },
        },
      },
      series: chart.series.map((seriesItem: any) => ({
        name: seriesItem.name,
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        data: seriesItem.data.map((d: any) => d.y), // Extract Y values
        itemStyle: {
          color: seriesItem.color,
        },
      })),
    }));
    this.buildReportSettingItems();
  }

  private buildReportSettingItems(): void {
    this.reportSettingItems = this.wellBoreDataForPdfData.map((setting) => ({
      label: setting.name,
      icon: setting.isVisible ? 'pi pi-check' : undefined,
      command: () => {
        setting.isVisible = !setting.isVisible;
        this.buildReportSettingItems();
         this.generateChartOptionsForPdf();
      }
    }));
  }

  isValidValue(value: any): boolean {
    return value !== null && value !== undefined && !Number.isNaN(value);
  }

  loadSurveyChartDataForPdf(): void {
    this.chartDataArrayForPdf = [];
    const seriesConfig = [
      {
        chartName: 'Depth vs Delta Azimuth',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `Delta Azimuth (${this.getUnit('deltaAzimuth')})`,
        series: [
          { name: `Delta Azimuth (${this.getUnit('deltaAzimuth')})`, yField: 'deltaAzimuth', color: '#D6BBA3' },
          { name: `Threshold (${this.commonService.facConfiguration?.azimuthQCLimits?.unit ?? ''})`, yField: 'deltaAzimuthTaget', color: 'red' },
        ],
      },
      {
        chartName: 'Depth vs Delta Grav Total Field',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `Delta Grav Total Field (${this.getUnit('deltaGravTotalField')})`,
        series: [
          { name: `Delta Grav Total Field (${this.getUnit('deltaGravTotalField')})`, yField: 'deltaGravTotalField', color: '#A3C6D6' },
          { name: `Threshold (${this.commonService.facConfiguration?.gTotalQCLimits?.unit ?? ''})`, yField: 'deltaGravTotalTaget', color: 'red' },
        ],
      },
      {
        chartName: 'Depth vs Delta Inclination',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `Delta Inclination (${this.getUnit('deltaInclination')})`,
        series: [
          { name: `Delta Inclination (${this.getUnit('deltaInclination')})`, yField: 'deltaInclination', color: '#D6A3C6' },
          { name: `Threshold (${this.commonService.facConfiguration?.inclinationQCLimits?.unit ?? ''})`, yField: 'deltaInclinationTarget', color: 'red' },
        ],
      },
      {
        chartName: 'Depth vs Delta Mag Dip Angle',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `Delta Mag Dip Angle (${this.getUnit('deltaMagDipAngle')})`,
        series: [
          { name: `Delta Mag Dip Angle (${this.getUnit('deltaMagDipAngle')})`, yField: 'deltaMagDipAngle', color: '#C6D6A3' },
          { name: `Threshold (${this.commonService.facConfiguration?.dipQCLimits?.unit ?? ''})`, yField: 'deltaMagDipAngleTarget', color: 'red' },
        ],
      },
      {
        chartName: 'Depth vs Delta Mag Total Field',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `Delta Mag Total Field (${this.getUnit('deltaMagTotalField')})`,
        series: [
          { name: `Delta Mag Total Field (${this.getUnit('deltaMagTotalField')})`, yField: 'deltaMagTotalField', color: '#A3D6BB' },
          { name: `Threshold (${this.commonService.facConfiguration?.bTotalQCLimits?.unit ?? ''})`, yField: 'deltaMagTotalFieldTarget', color: 'red' },
        ],
      },
      {
        chartName: 'Depth vs Azimuth',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `Azimuth (${this.getUnit('azimuth')})`,
        series: [
          { name: `Azimuth (${this.getUnit('azimuth')})`, yField: 'azimuth', color: '#A8654E' },
          { name: `Calculated Azimuth (${this.getUnit('azimuth')})`, yField: 'calculatedAzimuth', color: '#D6BBA3' },
        ],
      },
      {
        chartName: 'Depth vs Inclination',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `Inclination (${this.getUnit('inclination')})`,
        series: [
          { name: `Inclination (${this.getUnit('inclination')})`, yField: 'inclination', color: '#A85E90' },
          { name: `Calculated Inclination (${this.getUnit('inclination')})`, yField: 'calculatedInclination', color: '#D1E4FF' },
        ],
      },
      {
        chartName: 'Depth vs Gravity Total Field',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `Gravity Total Field (${this.getUnit('gravTotalFieldReference')})`,
        series: [
          { name: `Gravity Total Field Calc (${this.getUnit('gravTotalFieldReference')})`, yField: 'gravTotalFieldCalc', color: '#C8A176' },
          { name: `Gravity Total Field Reference (${this.getUnit('gravTotalFieldReference')})`, yField: 'gravTotalFieldReference', color: '#77E0FF' },
        ],
      },
      {
        chartName: 'Depth vs Dip',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `Dip (${this.getUnit('magDipAngleReference')})`,
        series: [
          { name: `Mag Dip Angle Calc (${this.getUnit('magDipAngleReference')})`, yField: 'magDipAngleCalc', color: '#edc605' },
          { name: `Mag Dip Angle Reference (${this.getUnit('magDipAngleReference')})`, yField: 'magDipAngleReference', color: '#00AA55' },
        ],
      },
      {
        chartName: 'Depth vs BTotal',
        xAxisName: `Measured Depth (${this.getUnit('measuredDepth')})`,
        yAxisName: `BTotal (${this.getUnit('magTotalFieldReference')})`,
        series: [
          { name: `Mag Total Field Calc (${this.getUnit('magTotalFieldReference')})`, yField: 'magTotalFieldCalc', color: '#edc605' },
          { name: `Mag Total Field Reference (${this.getUnit('magTotalFieldReference')})`, yField: 'magTotalFieldReference', color: '#00AA55' },
        ],
      },
    ];

    this.wellBoreDataForPdfData = seriesConfig.map((config) => ({
      isVisible: true,
      name: config.chartName,
      xAxisName: config.xAxisName,
      yAxisName: config.yAxisName,
      series: config.series.map((seriesItem) => ({
        name: seriesItem.name,
        type: 'line',
        color: seriesItem.color,
        data: this.wellBoreDataForPdf.map((item: any) => ({
          x: item.measuredDepth ?? '',
          y: this.formatAzimuth(item[seriesItem.yField]),
        })),
      })),
    }));
    this.generateChartOptionsForPdf()
  }

  formatAzimuth(value: number | undefined): number {
    if (value === undefined || isNaN(value)) return NaN;
    switch (Number(this.selectedAzimuthType)) {
      case 1: // -180° to 180°
        return value > 180 ? value - 360 : value;
      case 2: // 0° to 360°
        return value < 0 ? value + 360 : value;
      default: // Auto adjusted
        return value;
    }
  }

  getAllServiceCompanyNames(company: any): string {
    const formattedNames = this.commonService.formatName(company);
    return Array.isArray(formattedNames) ? formattedNames.join(', ') : formattedNames;
  }

  public isShowAutoApprovedSurveyEnable: boolean = false;
  showAutoApprovedSurvey(): void {
    this.filteredWellBoreDataForPdf = this.isShowAutoApprovedSurveyEnable
      ? this.wellBoreDataForPdf.filter((x: any) => x.surveyStatus === "AutoApproved")
      : [...this.wellBoreDataForPdf];
  }

  generatePdfReport(
    printContent: HTMLElement | null,
    contentStartHeder: HTMLElement | null,
    windowContent: string,
    surveys: HTMLElement | null,
    disclaimer: HTMLElement | null
  ): void {
    if (!printContent) {
      return;
    }

    const pdfWrapper = document.createElement('div');
    pdfWrapper.className = 'report pdf-export-wrapper';

    const reportContainer = document.querySelector('.report-container') as HTMLElement | null;
    if (reportContainer) {
      const containerStyles = getComputedStyle(reportContainer);
      pdfWrapper.style.setProperty('--report-red', containerStyles.getPropertyValue('--report-red').trim() || '#c70000');
      pdfWrapper.style.setProperty('--report-red-dark', containerStyles.getPropertyValue('--report-red-dark').trim() || '#930000');
      pdfWrapper.style.setProperty('--cover-width', containerStyles.getPropertyValue('--cover-width').trim() || '808px');
      pdfWrapper.style.setProperty('--cover-image-height', containerStyles.getPropertyValue('--cover-image-height').trim() || '430px');
      pdfWrapper.style.setProperty('--cover-title-height', containerStyles.getPropertyValue('--cover-title-height').trim() || '167px');
    } else {
      pdfWrapper.style.setProperty('--report-red', '#c70000');
      pdfWrapper.style.setProperty('--report-red-dark', '#930000');
      pdfWrapper.style.setProperty('--cover-width', '808px');
      pdfWrapper.style.setProperty('--cover-image-height', '430px');
      pdfWrapper.style.setProperty('--cover-title-height', '167px');
    }

    pdfWrapper.style.setProperty('-webkit-print-color-adjust', 'exact');
    pdfWrapper.style.setProperty('print-color-adjust', 'exact');

    const printClone = printContent.cloneNode(true) as HTMLElement;
    pdfWrapper.appendChild(printClone);

    if (windowContent) {
      const chartWrapper = document.createElement('div');
      chartWrapper.innerHTML = windowContent;
      pdfWrapper.appendChild(chartWrapper);
    }

    if (contentStartHeder) {
      pdfWrapper.appendChild(contentStartHeder.cloneNode(true));
    }

    if (surveys) {
      pdfWrapper.appendChild(surveys.cloneNode(true));
    }

    if (disclaimer) {
      pdfWrapper.appendChild(disclaimer.cloneNode(true));
    }

    const fileName = `Report_${this.wellDataForPdf?.wellboreInfo?.wellboreId?.value || 'Well'}.pdf`;

    const pdfOptions: any = {
      margin: 0,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      pagebreak: {
        mode: ['css', 'legacy'],
        before: ['.a4.disclaimer'],
        avoid: ['.pdf-avoid-break', '.well-info-table', 'table']
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(pdfWrapper).set(pdfOptions).save();
  }
}
