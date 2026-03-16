import { Component } from '@angular/core';


@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  // public serverConnectionLight: boolean = false;
  // public environment = environment;
  // public applicationVersion!: string;
  // public simulationStatus: boolean = false;
  // public surveyCounts: SystemSummaryInfo = new SystemSummaryInfo();

  // constructor(
  //   public commonService: CommonService,
  //   private signalRService: SignalrService,
  //   private communicationService: CommunicationService
  // ) {
  //   this.getVersion();
  //   this.subscribeToConnectionStatus();
  //   this.simulationModeStatus();
  // }

  // getVersion() {
  //   this.communicationService.getVersion().subscribe((data: any) => {
  //     this.applicationVersion = data;
  //   });
  // }

  // subscribeToConnectionStatus(): void {
  //   this.signalRService.isServerConnected$.subscribe((data: any) => {
  //     this.serverConnectionLight = data;
  //   });
  // }

  // resetFilters() {
  //   this.commonService.selectedVendor = 'All Vendors';
  //   this.commonService.selectedSurveyType = -1;
  //   this.commonService.startDate = null;
  //   this.commonService.endDate = null;
  //   this.commonService.searchText = '';
  //   this.commonService.minFilterByAutoRejectedSurveys = null;
  //   this.commonService.filteredWellBoreArr = [...this.commonService.wellBoreArr];
  // }

  // simulationModeStatus() {
  //   this.communicationService.getSimulationModeStatus().subscribe(data => {
  //     this.simulationStatus = data;
  //   });
  // }

}
