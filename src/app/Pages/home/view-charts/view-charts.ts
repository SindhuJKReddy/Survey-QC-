import { Component, computed, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { CommonService } from '../../../services/common-service';
import { CommunicationService } from '../../../services/communication-service';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DefaultXAxisConfiguration } from '../../../models/WellBore/DefaultXAxisConfiguration';
import { DefaultYAxisConfiguration } from '../../../models/WellBore/DefaultYAxisConfiguration';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-charts',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgxEchartsModule,
    ButtonModule,
    CardModule,
    ToolbarModule,
    ProgressSpinnerModule,
    SelectButtonModule,
    AutoCompleteModule
  ],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts }
    }
  ],
  templateUrl: './view-charts.html',
  styleUrl: './view-charts.css',
})
export class ViewCharts {
  private destroy$ = new Subject<void>();
  public readonly currentWellboreId = signal<string | null>(null);
  public readonly selectedWellTitle = computed(() => {
    const wellboreId = this.currentWellboreId();
    if (!wellboreId) {
      return 'Well Charts';
    }

    const selectedWell = this.commonService
      .wellBoreArrState()
      .find((well: any) => well?.wellboreInfo?.wellboreId?.value === wellboreId);

    return selectedWell?.wellboreInfo?.wellboreId?.value || wellboreId;
  });

  public goBackToHome(): void {
    this.router.navigateByUrl('');
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

  private fetchSurveysAndRender(wellboreId: string): void {

    console.log("Calling survey API with:", wellboreId);

    this.communicationService.getWellboreSurveys(wellboreId).subscribe({

      next: (data) => {
        console.log("Survey API response:", data);
        this.wellBoreResponse = data;

        this.processSurveyData(data?.wellboreSurveys || []);
        this.updateChartDisplay();

        // this.isLoading = false;

        // console.log("Hiding loader");

        // showLoader(false);
      },
      error: (err) => {
        console.error("Survey API error:", err);

        // this.isLoading = false;
        // showLoader(false);
      }
    });
  }

  public wellBoreResponse: any;
  public chartOption!: EChartsOption;
  public wellboreSurveyChartData: any[] = [];
  public chartDataArray: any[] = [];
  public isLoading: boolean = false;

  public xAxisConfig = new DefaultXAxisConfiguration();
  public yAxisConfig = new DefaultYAxisConfiguration();

  public selectedChartIndex: number = 5;
  public selectedAzimuthType: number = 2;
  public selectedChartOption: { label: string; value: number } | null = null;
  public filteredChartOptions: { label: string; value: number }[] = [];

  public readonly azimuthOptions = [
    { label: '0° - 360°', value: 2 },
    { label: '-180° - 180°', value: 1 }
  ];

  public readonly chartMenuOptions = [
    { label: 'Depth vs Delta Azimuth', value: 5 },
    { label: 'Depth vs Delta GTotal Field', value: 6 },
    { label: 'Depth vs Delta Inclination', value: 7 },
    { label: 'Depth vs Delta Mag Dip Angle', value: 8 },
    { label: 'Depth vs Delta Mag Total Field', value: 9 },
    { label: 'Depth vs Azimuth', value: 0 },
    { label: 'Depth vs Inclination', value: 1 },
    { label: 'Depth vs Gravity Total Field', value: 2 },
    { label: 'Depth vs Dip', value: 3 },
    { label: 'Depth vs BTotal', value: 4 }
  ];

  constructor(
    private communicationService: CommunicationService,
    public commonService: CommonService,
    private router: Router
  ) {
    this.chartOption = {
      title: {
        text: 'Loading chart...',
        left: 'center',
        top: 'middle',
        textStyle: { color: '#cfcfcf', fontSize: 14 }
      },
      xAxis: { show: false },
      yAxis: { show: false },
      series: []
    };
    this.filteredChartOptions = [...this.chartMenuOptions];
    this.selectedChartOption = this.chartMenuOptions.find(option => option.value === this.selectedChartIndex) ?? null;
  }

  public filterChartOptions(event: any): void {
    const query = (event?.query ?? '').toLowerCase().trim();
    if (!query) {
      this.filteredChartOptions = [...this.chartMenuOptions];
      return;
    }

    this.filteredChartOptions = this.chartMenuOptions.filter(option =>
      option.label.toLowerCase().includes(query)
    );
  }

  public onChartSelectionChange(event: any): void {
    const selected = event?.value as { label: string; value: number } | undefined;
    if (!selected || typeof selected.value !== 'number') {
      return;
    }

    this.selectedChartOption = selected;
    this.selectedChartIndex = selected.value;
    this.updateChartDisplay();
  }

  ngOnInit(): void {
    this.commonService.emitSelectedWellboreIdForCharts
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        if (id) this.viewCharts(id);
      });

    if (this.commonService.lastSelectedWellboreId) {
      this.viewCharts(this.commonService.lastSelectedWellboreId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public viewCharts(wellboreId: string): void {

    this.currentWellboreId.set(wellboreId);

    // showLoader(true, 'Retrieving Surveys...');
    // this.isLoading = true;

    //fror loader to show up before processing data

    if (this.hasFacLimits()) {
      this.fetchSurveysAndRender(wellboreId);
      return;
    }

    this.communicationService.getFacLimits().subscribe({
      next: (limits: any) => {
        if (limits) {
          this.commonService.facConfiguration = limits;
        }
        this.fetchSurveysAndRender(wellboreId);
      },
      error: () => {
        this.fetchSurveysAndRender(wellboreId);
      }
    });
  }

  private processSurveyData(surveys: any[]): void {
    const seenDepths = new Set();
    const config = this.commonService.facConfiguration ?? {};

    this.wellboreSurveyChartData = surveys
      .map(item => ({
        measuredDepth: item.measuredDepth?.value ?? null,
        azimuth: item.azimuth?.value ?? null,
        calculatedAzimuth: item.calculatedAzimuth?.value ?? null,
        inclination: item.inclination?.value ?? null,
        calculatedInclination: item.calculatedInclination?.value ?? null,
        gravTotalFieldCalc: item.gravTotalFieldCalc?.value ?? null,
        gravTotalFieldReference: item.gravTotalFieldReference?.value ?? null,
        magDipAngleCalc: item.magDipAngleCalc?.value ?? null,
        magDipAngleReference: item.magDipAngleReference?.value ?? null,
        magTotalFieldCalc: item.magTotalFieldCalc?.value ?? null,
        magTotalFieldReference: item.magTotalFieldReference?.value ?? null,
        deltaAzimuth: item.deltaAzimuth?.value ?? null,
        deltaGravTotalField: item.deltaGravTotalField?.value ?? null,
        deltaInclination: item.deltaInclination?.value ?? null,
        deltaMagDipAngle: item.deltaMagDipAngle?.value ?? null,
        deltaMagTotalField: item.deltaMagTotalField?.value ?? null,

        deltaAzimuthTarget: config?.azimuthQCLimits?.threshold ?? 0,
        deltaGravTotalTarget: config?.gTotalQCLimits?.threshold ?? 0,
        deltaInclinationTarget: config?.inclinationQCLimits?.threshold ?? 0,
        deltaMagDipAngleTarget: config?.dipQCLimits?.threshold ?? 0,
        deltaMagTotalFieldTarget: config?.bTotalQCLimits?.threshold ?? 0
      }))
      .filter(item => {
        if (item.measuredDepth === null || seenDepths.has(item.measuredDepth)) return false;
        seenDepths.add(item.measuredDepth);
        return true;
      })
      .sort((a, b) => a.measuredDepth - b.measuredDepth);
  }

  public updateChartDisplay(): void {
    this.buildChartConfigs();
    this.renderSelectedChart();
  }

  private buildChartConfigs(): void {
    const surveys = this.wellBoreResponse?.wellboreSurveys || [];
    const getUnit = (key: string) => surveys.find((s: any) => s?.[key]?.valueUnit)?.[key]?.valueUnit || '';
    const limits = this.commonService.facConfiguration ?? {};

    const definitions = [
      {
        title: 'Depth vs Azimuth',
        yAxis: `Azimuth (${getUnit('azimuth')})`,
        series: [
          { name: 'Azimuth', field: 'azimuth', color: '#A8654E' },
          { name: 'Calculated', field: 'calculatedAzimuth', color: '#D6BBA3' }
        ]
      },
      {
        title: 'Depth vs Inclination',
        yAxis: `Inclination (${getUnit('inclination')})`,
        series: [
          { name: 'Inclination', field: 'inclination', color: '#A85E90' },
          { name: 'Calculated', field: 'calculatedInclination', color: '#D1E4FF' }
        ]
      },
      {
        title: 'Depth vs Gravity Total Field',
        yAxis: `GTotal (${getUnit('gravTotalFieldReference')})`,
        series: [
          { name: 'Calc', field: 'gravTotalFieldCalc', color: '#C8A176' },
          { name: 'Ref', field: 'gravTotalFieldReference', color: '#77E0FF' }
        ]
      },
      {
        title: 'Depth vs Dip',
        yAxis: `Dip (${getUnit('magDipAngleReference')})`,
        series: [
          { name: 'Calc', field: 'magDipAngleCalc', color: '#edc605' },
          { name: 'Ref', field: 'magDipAngleReference', color: '#00AA55' }
        ]
      },
      {
        title: 'Depth vs BTotal',
        yAxis: `BTotal (${getUnit('magTotalFieldReference')})`,
        series: [
          { name: 'Calc', field: 'magTotalFieldCalc', color: '#edc605' },
          { name: 'Ref', field: 'magTotalFieldReference', color: '#00AA55' }
        ]
      },
      {
        title: 'Depth vs Delta Azimuth',
        yAxis: `Delta Azimuth (${getUnit('deltaAzimuth')})`,
        series: [
          { name: `Delta Azimuth (${getUnit('deltaAzimuth')})`, field: 'deltaAzimuth', color: '#D6BBA3' },
          { name: `Threshold (${limits?.azimuthQCLimits?.unit ?? ''})`, field: 'deltaAzimuthTarget', color: 'red' }
        ]
      },
      {
        title: 'Depth vs Delta GTotal',
        yAxis: `Delta GTotal (${getUnit('deltaGravTotalField')})`,
        series: [
          { name: `Delta GTotal (${getUnit('deltaGravTotalField')})`, field: 'deltaGravTotalField', color: '#A3C6D6' },
          { name: `Threshold (${limits?.gTotalQCLimits?.unit ?? ''})`, field: 'deltaGravTotalTarget', color: 'red' }
        ]
      },
      {
        title: 'Depth vs Delta Inclination',
        yAxis: `Delta Inc (${getUnit('deltaInclination')})`,
        series: [
          { name: `Delta Inclination (${getUnit('deltaInclination')})`, field: 'deltaInclination', color: '#D6A3C6' },
          { name: `Threshold (${limits?.inclinationQCLimits?.unit ?? ''})`, field: 'deltaInclinationTarget', color: 'red' }
        ]
      },
      {
        title: 'Depth vs Delta Dip',
        yAxis: `Delta Dip (${getUnit('deltaMagDipAngle')})`,
        series: [
          { name: `Delta Dip (${getUnit('deltaMagDipAngle')})`, field: 'deltaMagDipAngle', color: '#C6D6A3' },
          { name: `Threshold (${limits?.dipQCLimits?.unit ?? ''})`, field: 'deltaMagDipAngleTarget', color: 'red' }
        ]
      },
      {
        title: 'Depth vs Delta BTotal',
        yAxis: `Delta BTotal (${getUnit('deltaMagTotalField')})`,
        series: [
          { name: `Delta BTotal (${getUnit('deltaMagTotalField')})`, field: 'deltaMagTotalField', color: '#A3D6BB' },
          { name: `Threshold (${limits?.bTotalQCLimits?.unit ?? ''})`, field: 'deltaMagTotalFieldTarget', color: 'red' }
        ]
      }
    ];

    const depthUnit = getUnit('measuredDepth');

    this.chartDataArray = definitions.map(def => ({
      name: def.title,
      xAxisName: `Measured Depth (${depthUnit})`,
      yAxisName: def.yAxis,
      series: def.series.map(s => ({
        name: s.name,
        color: s.color,
        data: this.wellboreSurveyChartData.map(d => ({
          x: d.measuredDepth,
          y: this.formatAzimuthValue(d[s.field], def.title)
        }))
      }))
    }));
  }

  private formatAzimuthValue(value: any, chartTitle: string): number {
    if (value === null || isNaN(value)) return NaN;

    if (!chartTitle.toLowerCase().includes('azimuth')) return value;

    const type = Number(this.selectedAzimuthType);
    if (type === 1) return value > 180 ? value - 360 : value;
    if (type === 2) return value < 0 ? value + 360 : value;
    return value;
  }

  private renderSelectedChart(): void {
    const data = this.chartDataArray[this.selectedChartIndex];
    if (!data) {
      this.chartOption = {
        title: {
          text: 'No chart data available',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#cfcfcf', fontSize: 14 }
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: []
      };
      return;
    }

    const textColor = this.yAxisConfig.splitLine.lineStyle.color || '#ffffff';
    const isDeltaChart = data.name.toLowerCase().includes('delta');

    this.chartOption = {
      backgroundColor: 'transparent',
      legend: {
        show: true,
        textStyle: { color: '#ffffff' },
        type: 'scroll',
        orient: 'horizontal',
        right: "0%",
        top: '0%',
        icon: 'roundRect'
      },
      grid: {
        left: '80px',
        right: '20px',
        bottom: '80px',
        top: '40px'
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#363434',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          const depth = params?.[0]?.axisValue ?? 'N/A';
          let res = `<div style="padding:5px"><strong>${data.xAxisName}:</strong> ${depth}</div>`;
          params.forEach((p: any) => {
            const numericValue = Number(p.data);
            const val = Number.isFinite(numericValue) ? numericValue.toFixed(4) : 'N/A';
            res += `<div><span style="color:${p.color}">●</span> ${p.seriesName}: ${val}</div>`;
          });
          return res;
        }
      },
      xAxis: {
        type: 'category',
        name: data.xAxisName,
        nameLocation: 'middle',
        nameGap: 30,
        data: data.series[0].data.map((d: any) => d.x),
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: {
          show: this.xAxisConfig.splitLine.show,
          lineStyle: { color: this.xAxisConfig.splitLine.lineStyle.color }
        }
      },
      yAxis: {
        type: 'value',
        name: data.yAxisName,
        nameLocation: 'middle',
        nameGap: 50,
        min: isDeltaChart ? 0 : undefined,
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: {
          show: this.yAxisConfig.splitLine.show,
          lineStyle: { color: this.yAxisConfig.splitLine.lineStyle.color }
        }
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 15,
          left: 80,
          right: 20,
          bottom: 10,
          borderColor: '#4a5869',
          backgroundColor: 'rgba(19, 31, 45, 0.82)',
          fillerColor: 'rgba(117, 132, 173, 0.58)',
          moveHandleStyle: {
            color: '#8ea3d9'
          },
          textStyle: {
            color: '#b9c7d8'
          }
        },
        { type: 'inside', xAxisIndex: 0 },
        {
          type: 'slider',
          yAxisIndex: 0,
          width: 8,
          left: 18,
          top: 40,
          bottom: 80,
          borderColor: '#4a5869',
          backgroundColor: 'rgba(19, 31, 45, 0.82)',
          fillerColor: 'rgba(117, 132, 173, 0.58)',
          moveHandleStyle: {
            color: '#4a5869'
          },
          textStyle: {
            color: '#b9c7d8'
          }
        },
        { type: 'inside', yAxisIndex: 0 }
      ],
      series: data.series.map((s: any) => ({
        name: s.name,
        type: 'line',
        color: s.color,
        showSymbol: false,
        connectNulls: true,
        data: s.data.map((d: any) => d.y)
      }))
    };
  }

}
