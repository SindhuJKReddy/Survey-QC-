import { Component, inject, Input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CommunicationService } from '../../../services/communication-service';
import { CommonService } from '../../../services/common-service';
import { CommonModule, DatePipe, NgFor, NgIf } from '@angular/common';
import { ScrollerModule } from 'primeng/scroller';

@Component({
  selector: 'app-card',
  imports: [
    ButtonModule,
    TooltipModule,
    CommonModule,
    DatePipe,
    ScrollerModule
  ],
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {

  Object = Object;

  public commonService = inject(CommonService);
  private communicationService = inject(CommunicationService);

  constructor(
  ) {
    this.commonService.getMonitorWellBores();
  }

  getAllServiceCompanyNames(companies: any[]): string {
    return companies.map(company => this.commonService.formatName(company?.name)).join(', ');
  }

  InitiateRunMSA(well: any) {
    this.communicationService.ProcessWellboreForMSA(well.wellboreInfo.wellboreId.value).subscribe((data: any) => {
      if (data) {
        this.commonService.showNotification('success', 'MSA Initiated for ' + well.wellboreInfo.wellboreId.value, '')
      }
      else {
        this.commonService.showNotification('error', 'Failed to Initiate MSA for ' + well.wellboreInfo.wellboreId.value, '')
      }
    });
  }

}
