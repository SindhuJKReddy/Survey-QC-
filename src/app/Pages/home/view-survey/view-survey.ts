import {
  Component, HostListener,
  ViewChild,
  OnDestroy,
  AfterViewInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Table, TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';

import { Subject, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { CommunicationService } from '../../../services/communication-service';
import { CommonService } from '../../../services/common-service';

import { SurveyStatus } from '../../../models/WellBore/surveyStatus';
import { Survey } from '../../../models/WellBore/Survey';
import { SurveyError } from '../../../Enums/SurveyError';
import { UserSelectedToolCode } from '../../../Enums/UserSelectedToolCode';

import { Router } from '@angular/router';

@Component({
  selector: 'app-view-survey',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    SelectButtonModule,
    TooltipModule,
    TextareaModule,
    MenuModule,
    ToolbarModule,
    SelectModule,
    RadioButtonModule
  ],
  templateUrl: './view-survey.html',
  styleUrl: './view-survey.css',
})
export class ViewSurvey implements AfterViewInit, OnDestroy {

  private destroy$ = new Subject<void>();
  wellBoreRequestResponse = signal<any>(null);
  wellboreSurveyData = signal<Survey[]>([]);
  filteredSurveyData = signal<Survey[]>([]);
  wellboreSurveyHeaders = signal<any[]>([]);

  private _selectedSurveyType = signal<string>('All');
  get selectedSurveyType() { return this._selectedSurveyType(); }
  set selectedSurveyType(v: string) { this._selectedSurveyType.set(v); }

  selectedRows = signal<number[]>([]);
  lastSelectedRow = signal<number | null>(null);

  private _isCommentModalVisible = signal<boolean>(false);
  get isCommentModalVisible() { return this._isCommentModalVisible(); }
  set isCommentModalVisible(v: boolean) { this._isCommentModalVisible.set(v); }

  private _comment = signal<string>('');
  get comment() { return this._comment(); }
  set comment(v: string) { this._comment.set(v); }

  showMenu = signal<boolean>(false);
  menuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  currentSurvey = signal<any>(null);
  showToolCodeMenu = signal<boolean>(false);

  public surveyStatusEnum = SurveyStatus;
  public surveyToolCodeEnum = UserSelectedToolCode;
  public surveyErrorStatusEnum = SurveyError;

  // Options for Dropdowns/Menus
  surveyStatusOptions = signal<any[]>([]);
  surveyToolCodeOptions = signal<any[]>([]);
  rightClickStatusOptions = signal<MenuItem[]>([]);
  rightClickToolCodeStatusOptions = signal<MenuItem[]>([]);

  constructor(
    private communicationService: CommunicationService,
    public _commonService: CommonService,
    private router: Router
  ) {
    this.generateDropdownOptions();
    this.generateContextMenuOptions();

    if (this._commonService.lastSelectedWellboreId) {
      this.getWellboreSurveys(this._commonService.lastSelectedWellboreId);
    }

    this._commonService.emitSelectedWellboreId
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => this.getWellboreSurveys(id));
  }

  surveyTypeOptions = [
    { label: 'All', value: 'All' },
    { label: 'Auto Approved', value: 'AutoApproved' },
    { label: 'User Approved', value: 'UserApproved' },
    { label: 'Auto Rejected', value: 'AutoRejected' },
    { label: 'User Rejected', value: 'UserRejected' },
    { label: 'Gyro', value: 'Gyro' },
    { label: 'Unknown', value: 'Unknown' }
  ];

  getErrorMessage(data: any): string {
    if (!data?.errors?.length) return '';

    const messages = data.errors
      .flatMap((e: any) => e.errorMessages || [])
      .filter((msg: any) => typeof msg === 'string' && msg.trim().length > 0);

    if (!messages.length) return 'Errors: N/A';

    return `Errors:\n• ${messages.join('\n• ')}`;
  }

  private generateDropdownOptions(): void {
    const mapEnum = (en: any) => Object.keys(en)
      .filter(k => isNaN(Number(k)))
      .map(k => ({ label: k, value: en[k as keyof typeof en] }));

    this.surveyStatusOptions.set(mapEnum(this.surveyStatusEnum));
    this.surveyToolCodeOptions.set(mapEnum(this.surveyToolCodeEnum));
  }

  private generateContextMenuOptions(): void {
    this.rightClickStatusOptions.set(Object.keys(this.surveyStatusEnum)
      .filter(key => {
        const isStringKey = isNaN(Number(key));
        if (!isStringKey) return false;
        const enumValue = this.surveyStatusEnum[key as keyof typeof SurveyStatus];
        return enumValue !== SurveyStatus.AutoApproved &&
          enumValue !== SurveyStatus.AutoRejected;
      })
      .map(key => ({
        label: key,
        command: () => {
          const statusValue = this.surveyStatusEnum[key as keyof typeof SurveyStatus] as unknown as number;
          this.onSelectSurveyStatus(statusValue);
        }
      })));

    this.rightClickToolCodeStatusOptions.set(Object.keys(this.surveyToolCodeEnum)
      .filter(key => isNaN(Number(key)))
      .map(key => ({
        label: key,
        command: () => {
          const toolCodeValue = this.surveyToolCodeEnum[key as keyof typeof UserSelectedToolCode] as unknown as number;
          this.onSelectToolCode(toolCodeValue);
        }
      })));
  }

  getWellboreSurveys(wellboreId: string): void {
    this.wellBoreRequestResponse.set(null);
    this.wellboreSurveyData.set([]);
    this.selectedRows.set([]);
    showLoader(true, 'Retrieving Surveys...');

    this.communicationService.getWellboreSurveys(wellboreId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.wellBoreRequestResponse.set(data);

        if (data) {
          this.wellboreSurveyData.set(data.wellboreSurveys
            .map((item: Survey) => ({
              id: item.id,
              surveyStatus: item.surveyStatus,
              overrideToolCode: item.overrideToolCode,
              calculatedAzimuth: item.calculatedAzimuth?.value,
              measuredDepth: item.measuredDepth?.value,
              gravAxialRaw: item.gravAxialRaw?.value,
              gravTran1Raw: item.gravTran1Raw?.value,
              gravTran2Raw: item.gravTran2Raw?.value,
              magAxialRaw: item.magAxialRaw?.value,
              magTran1Raw: item.magTran1Raw?.value,
              magTran2Raw: item.magTran2Raw?.value,
              inclination: item.inclination?.value,
              calculatedInclination: item.calculatedInclination?.value,
              azimuth: item.azimuth?.value,
              wellboreStateId: item.wellboreStateId,
              toolCode: item.toolCode,
              errors: item.errors,
              comment: item.comment,
              serviceCompany: this.getAllServiceCompanyNames(item.logName?.value),
              iFR1LongCollarAzimuth: item.ifR1LongCollarAzimuth?.value,
              iFR1ShortCollarAzimuth: item.ifR1ShortCollarAzimuth?.value,
              msaSolutionAz: item.msaSolutionAz?.value,
              msaSolutionInc: item.msaSolutionInc?.value,
              msaSolutionBt: item.msaSolutionBt?.value,
              msaSolutionGt: item.msaSolutionGt?.value,
              msaSolutionDip: item.msaSolutionDip?.value,
              msaService: item.msaService?.value,
              msaComments: item.msaComments?.value,
              longCollarAzimuth: item.longCollarAzimuth?.value,
              shortCollarAzimuth: item.shortCollarAzimuth?.value,
            }))
            .sort((a: any, b: any) => a.measuredDepth - b.measuredDepth));

          if (this.wellboreSurveyData().length > 0) {
            const surveys = this.wellBoreRequestResponse().wellboreSurveys;
            const getUnit = (key: string): string => {
              for (const survey of surveys) {
                if (survey?.[key]?.valueUnit) return survey[key].valueUnit;
              }
              return '';
            };

            this.wellboreSurveyHeaders.set([
              { key: 'surveyStatus', label: 'Survey Status', width: '120px' },
              { key: 'overrideToolCode', label: 'Survey Type', width: '120px' },
              { key: 'serviceCompany', label: 'Service Company', width: '180px' },
              { key: 'gravAxialRaw', label: 'Grav Axial Raw', unit: getUnit('gravAxialRaw'), width: '120px' },
              { key: 'gravTran1Raw', label: 'Grav Tran1 Raw', unit: getUnit('gravTran1Raw'), width: '120px' },
              { key: 'gravTran2Raw', label: 'Grav Tran2 Raw', unit: getUnit('gravTran2Raw'), width: '120px' },
              { key: 'magAxialRaw', label: 'Mag Axial Raw', unit: getUnit('magAxialRaw'), width: '120px' },
              { key: 'magTran1Raw', label: 'Mag Tran1 Raw', unit: getUnit('magTran1Raw'), width: '120px' },
              { key: 'magTran2Raw', label: 'Mag Tran2 Raw', unit: getUnit('magTran2Raw'), width: '120px' },
              { key: 'inclination', label: 'Inclination', unit: getUnit('inclination'), width: '120px' },
              { key: 'calculatedInclination', label: 'Calc Inclination', unit: getUnit('calculatedInclination'), width: '120px' },
              { key: 'azimuth', label: 'Azimuth', unit: getUnit('azimuth'), width: '120px' },
              { key: 'calculatedAzimuth', label: 'Calc Azimuth', unit: getUnit('calculatedAzimuth'), width: '120px' },
              { key: 'measuredDepth', label: 'Measured Depth', unit: getUnit('measuredDepth'), width: '140px' },
              { key: 'toolCode', label: 'Tool Code', width: '120px' },
              { key: 'longCollarAzimuth', label: 'LongCollarAzimuth', unit: getUnit('longCollarAzimuth'), width: '150px' },
              { key: 'shortCollarAzimuth', label: 'ShortCollarAzimuth', unit: getUnit('shortCollarAzimuth'), width: '150px' },
              { key: 'iFR1ShortCollarAzimuth', label: 'IFR1ShortCollarAzimuth', unit: getUnit('ifR1ShortCollarAzimuth'), width: '150px' },
              { key: 'iFR1LongCollarAzimuth', label: 'IFR1LongCollarAzimuth', unit: getUnit('ifR1LongCollarAzimuth'), width: '150px' },
              { key: 'msaSolutionAz', label: 'MSA Solution Az', unit: getUnit('msaSolutionAz'), width: '150px' },
              { key: 'msaSolutionInc', label: 'MSA Solution Inc', unit: getUnit('msaSolutionInc'), width: '150px' },
              { key: 'msaSolutionBt', label: 'MSA Solution Bt', unit: getUnit('msaSolutionBt'), width: '150px' },
              { key: 'msaSolutionGt', label: 'MSA Solution Gt', unit: getUnit('msaSolutionGt'), width: '150px' },
              { key: 'msaSolutionDip', label: 'MSA Solution Dip', unit: getUnit('msaSolutionDip'), width: '150px' },
              { key: 'msaService', label: 'MSA Service', width: '150px' },
              { key: 'msaComments', label: 'MSA Comments', width: '150px' },
              { key: 'messages', label: 'Message', width: '120px' },
            ]);
          }
        }

        setTimeout(() => showLoader(false));
        this.onSurveyTypeChange();
      });
  }

  onSurveyTypeChange(): void {
    if (this.selectedSurveyType === 'All') {
      this.filteredSurveyData.set([...this.wellboreSurveyData()]);
    }
    else if (this.selectedSurveyType === 'Gyro') {
      const targetToolCode = this.surveyToolCodeEnum[this.selectedSurveyType as keyof typeof UserSelectedToolCode];
      this.filteredSurveyData.set(this.wellboreSurveyData().filter(
        item => item.overrideToolCode === targetToolCode
      ));
    }
    else {
      const statusMapping = this.surveyStatusEnum[this.selectedSurveyType as keyof typeof SurveyStatus];
      this.filteredSurveyData.set(this.wellboreSurveyData().filter(item => item.surveyStatus === statusMapping));
    }
  }

  onRowClick(event: MouseEvent, index: number): void {
    if (event.shiftKey && this.lastSelectedRow() !== null) {
      const start = Math.min(this.lastSelectedRow()!, index);
      const end = Math.max(this.lastSelectedRow()!, index);
      this.selectedRows.update(arr => {
        const copy = [...arr];
        for (let i = start; i <= end; i++) {
          if (!copy.includes(i)) copy.push(i);
        }
        return copy;
      });
    } else if (event.ctrlKey || event.metaKey) {
      this.selectedRows.update(arr => {
        const copy = [...arr];
        const idx = copy.indexOf(index);
        idx > -1 ? copy.splice(idx, 1) : copy.push(index);
        return copy;
      });
    } else {
      this.selectedRows.set([index]);
    }
    this.lastSelectedRow.set(index);
  }

  onRightClick(event: MouseEvent, survey: any, index: number): void {
    event.preventDefault();
    if (!this.selectedRows().includes(index)) {
      this.selectedRows.set([index]);
    }
    this.lastSelectedRow.set(index);
    this.showMenu.set(true);
    this.currentSurvey.set(survey);
    this.menuPosition.set({ x: event.clientX, y: event.clientY });
  }

  onToolCodeRightClick(event: MouseEvent, survey: any, index: number): void {
    event.preventDefault();
    if (!this.selectedRows().includes(index)) {
      this.selectedRows.set([index]);
    }
    this.lastSelectedRow.set(index);
    this.showToolCodeMenu.set(true);
    this.currentSurvey.set(survey);
    this.menuPosition.set({ x: event.clientX, y: event.clientY });
  }

  onSelectSurveyStatus(status: number): void {
    this.selectedRows().forEach(index => {
      const survey = this.filteredSurveyData()[index];
      if (survey) {
        survey.surveyStatus = status;
        const mainIdx = this.wellboreSurveyData().findIndex(item => item.id === survey.id);
        if (mainIdx !== -1) this.wellboreSurveyData()[mainIdx].surveyStatus = status;
      }
    });
    this.isCommentModalVisible = true;
  }

  onSelectToolCode(status: number): void {
    this.selectedRows().forEach(index => {
      const survey = this.filteredSurveyData()[index];
      if (survey) {
        survey.overrideToolCode = status;
        const mainIdx = this.wellboreSurveyData().findIndex(item => item.id === survey.id);
        if (mainIdx !== -1) this.wellboreSurveyData()[mainIdx].overrideToolCode = status;
      }
    });
    this.handleOk();
  }

  onSurveyToolCodeChange(survey: any) {
    const mainIdx = this.wellboreSurveyData().findIndex(item => item.id === survey.id);
    if (mainIdx !== -1) this.wellboreSurveyData()[mainIdx].overrideToolCode = Number(survey.overrideToolCode);
    this.handleOk();
  }

  onSurveyStatusChange(survey: any): void {
    const mainIdx = this.wellboreSurveyData().findIndex(item => item.id === survey.id);
    if (mainIdx !== -1) this.wellboreSurveyData()[mainIdx].surveyStatus = Number(survey.surveyStatus);
    this.isCommentModalVisible = true;
  }

  handleCancel(): void {
    this.isCommentModalVisible = false;
    this.comment = '';
    this.selectedRows().forEach(index => {
      const survey = this.filteredSurveyData()[index];
      if (survey) {
        const original = this.wellBoreRequestResponse().wellboreSurveys.find((item: any) => item.id === survey.id);
        if (original) {
          survey.surveyStatus = original.surveyStatus;
          survey.comment = original.comment || '';
        }
      }
    });
  }

  handleOk(): void {
    const payload = this.selectedRows().map(rowIndex => ({
      wellboreId: this.wellBoreRequestResponse().wellboreState.wellboreInfo.wellboreId.value,
      wellboreSurveyId: this.filteredSurveyData()[rowIndex]?.id,
      surveyStatus: Number(this.filteredSurveyData()[rowIndex]?.surveyStatus),
      toolCode: Number(this.filteredSurveyData()[rowIndex]?.overrideToolCode),
      comment: this.comment,
    }));

    showLoader(true, 'Updating Survey Status...');

    this.communicationService.updateWellboreSurveyStatus(payload).subscribe((data: boolean) => {
      showLoader(false);
      if (data) {
        const currentFiltered = this.filteredSurveyData();
        const newWb = [...this.wellboreSurveyData()];
        const newFiltered = currentFiltered.map((survey: any, index: number) => {
          if (this.selectedRows().includes(index)) {
            const updated = { ...survey, surveyStatus: currentFiltered[index].surveyStatus, comment: this.comment };
            const mainIdx = newWb.findIndex(item => item.id === survey.id);
            if (mainIdx !== -1) newWb[mainIdx] = { ...newWb[mainIdx], ...updated };
            return updated;
          }
          return survey;
        });
        this.wellboreSurveyData.set(newWb);
        this.filteredSurveyData.set(newFiltered);
      }
      this.isCommentModalVisible = false;
      this.comment = '';
    });
  }

  closeContextMenu(): void {
    this.showMenu.set(false);
    this.showToolCodeMenu.set(false);
  }

  getAllServiceCompanyNames(company: any): string {
    const formattedNames = this._commonService.formatName(company);
    return Array.isArray(formattedNames) ? formattedNames.join(', ') : formattedNames;
  }
  formatNumber(value: number | null | undefined): string {
    return value != null ? Number(value).toFixed(2) : '';
  }

  InitiateRunMSA() {
    const id = this.wellBoreRequestResponse()?.wellboreState?.wellboreInfo?.wellboreId?.value;
    if (!id) {
      this._commonService.showNotification('error', 'Unable to identify wellbore', '');
      return;
    }
    this.communicationService.ProcessWellboreForMSA(id).subscribe((data: any) => {
      const msg = data ? 'MSA Initiated for ' : 'Failed to Initiate MSA for ';
      this._commonService.showNotification(data ? 'success' : 'error', msg + id, '');
    });
  }

  exportTableToExcel(fileName: string): void {
    if (!this.filteredSurveyData().length) return;

    const headers = this.wellboreSurveyHeaders().map(h => h.label + (h.unit ? ` (${h.unit})` : ''));
    const statusIdx = this.wellboreSurveyHeaders().findIndex(h => h.key === 'surveyStatus');
    if (statusIdx !== -1) headers.splice(statusIdx + 1, 0, 'Errors');

    const rows = this.filteredSurveyData().map(data => {
      return this.wellboreSurveyHeaders().flatMap((header) => {
        let val = data[header.key as keyof Survey];
        if (header.key === 'surveyStatus') {
          const errs = (data as any).errors?.length ? (data as any).errors.flatMap((e: any) => e.errorMessages || []).join('; ') : '';
          return [this.surveyStatusEnum[val as any] || val, errs];
        }
        if (header.key === 'overrideToolCode') return [this.surveyToolCodeEnum[val as any] || val];
        if (header.key === 'toolCode') return [(val as any)?.value || ''];
        if (header.key === 'messages') return [data.comment ?? ''];
        return [typeof val === 'number' ? val.toFixed(2) : val ?? ''];
      });
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Survey Data');
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), `${fileName}.xlsx`);
  }

  ngAfterViewInit(): void {}

  goBackToHome(): void {
    this.router.navigateByUrl('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
