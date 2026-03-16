import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {

  private readonly dataUrl = 'oil_drilling_data.json';
  constructor(private http: HttpClient) { }

  // getOilDrillingData(): Observable<any> {
  //   return this.http.get<any>(this.dataUrl);
  // }

  public getAxisConfiguration() {
    return this.http.get('json/charts/DefaultAxisConfiguration.json');
  }
  public getDefaultTemplate() {
    return this.http.get('json/charts/AxisConfigurations.json')
  }

  public getCompressedWell() {
    return this.http.get('welldata.json')
  }

  public getWellboreState(wellboreId: any): Observable<any> {
    return this.http.get(`${environment.baseUrl}wells/get-wellbore-state?wellboreId=${wellboreId}`);
  }

  public getMonitoredWellbores(): Observable<any> {
    return this.http.get(environment.baseUrl + 'wells/get-monitored-wellbores');
  }

  public getWellboreSurveys(wellboreId: any): Observable<any> {
    return this.http.get(`${environment.baseUrl}wells/get-wellbore-surveys?wellboreId=${wellboreId}`);
  }
  

  public startProcessing(): Observable<any> {
    return this.http.get(environment.witsmlUrl + 'job-manager/start-processing');
  }

  public updateWellboreSurveyStatus(surveys:any): Observable<any> {
    return this.http.post(environment.baseUrl + 'wells/update-wellbore-survey-status', surveys);
  }

  public getFacLimits(): Observable<any> {
    return this.http.get(environment.baseUrl + 'configuration-manager/get-fac-limits');
  }

  public ProcessWellboreForMSA(wellboreId: any): Observable<any> {
    return this.http.post(environment.baseUrl + 'MSAProcessor/Process-Wellbore-MSA', 
      JSON.stringify(wellboreId), 
      { headers: { 'Content-Type': 'application/json' } } 
    );
  }
}
