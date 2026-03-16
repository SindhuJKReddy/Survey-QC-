import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonService } from '../../../services/common-service';
import { CommunicationService } from '../../../services/communication-service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-grid',
  imports: [
    CommonModule, ButtonModule, TooltipModule, TableModule
  ],
  templateUrl: './grid.html',
  styleUrl: './grid.css',
})
export class Grid {
  constructor(
    public commonService: CommonService,
    private communicationService: CommunicationService
  ) {}
 
  getAllServiceCompanyNames(companies: any[]): string {
    return companies.map(company => this.commonService.formatName(company?.name)).join(', ');
  }
 
  InitiateRunMSA(well: any) {
    this.communicationService.ProcessWellboreForMSA(well.wellboreInfo.wellboreId.value).subscribe((data: any) => {
      if (data) {
        this.commonService.showNotification('success', 'MSA Initiated for ' + well.wellboreInfo.wellboreId.value, '');
      } else {
        this.commonService.showNotification('error', 'Failed to Initiate MSA for ' + well.wellboreInfo.wellboreId.value, '');
      }
    });
  }

}
