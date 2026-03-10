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

  getOilDrillingData(): Observable<any> {
    return this.http.get<any>(this.dataUrl);
  }

  // public getChartConfiguration(filename) {
  //   return this.http.get(`json/charts/${filename}.json`)
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


  public getVersion(): Observable<any> {
    return this.http.get(environment.baseUrl + 'version/GetVersion', { responseType: 'text' });
  }

  public getWitsmlConnection(): Observable<any> {
    return this.http.get(environment.witsmlUrl + 'witsml/get-witsml-connection');
  }

  public isWitsmlConnectionValid(): Observable<any> {
    return this.http.get(environment.witsmlUrl + 'witsml/active-witsml-connection-valid');
  }

  public updateWitsmlConnection(payload: any): Observable<any> {
    return this.http.post(environment.witsmlUrl + 'witsml/update-witsml-connection', payload);
  }

  public testWitsmlConnection(payload: any): Observable<any> {
    return this.http.post(environment.witsmlUrl + 'witsml/test-witsml-connection', payload);
  }

  public getWellboreState(wellboreId: any): Observable<any> {
    return this.http.get(`${environment.baseUrl}wells/get-wellbore-state?wellboreId=${wellboreId}`);
  }

  public getMonitoredWellbores(): Observable<any> {
    return this.http.get(environment.baseUrl + 'wells/get-monitored-wellbores');
  }

  public getSurveyQueue(): Observable<any> {
    return this.http.get(environment.baseUrl + 'process-manager/get-survey-queue');
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


  public getEmailConfiguration(): Observable<any> {
    return this.http.get(environment.baseUrl + 'configuration-manager/get-email-configuration');
  }

  public updateEmailConfiguration(config:any): Observable<any> {
    return this.http.post(environment.baseUrl + 'configuration-manager/update-email-configuration', config);
  }

  public updateFacLimits(config:any): Observable<any> {
    return this.http.post(environment.baseUrl + 'configuration-manager/update-fac-limits', config);
  }

  public getFacLimits(): Observable<any> {
    return this.http.get(environment.baseUrl + 'configuration-manager/get-fac-limits');
  }


  public getSummaryInformation(): Observable<any> {
    return this.http.get(environment.baseUrl + 'wells/get-system-summary-information');
  }

  public getSimulationModeStatus(): Observable<any> {
    return this.http.get(environment.witsmlUrl + 'job-manager/is-simulation-mode');
  }

  public getProcessConfiguration(): Observable<any> {
    return this.http.get(environment.baseUrl + 'configuration-manager/get-process-configuration');
  }

  // public updateProcessConfiguration(payload): Observable<any> {
  //   return this.http.post(environment.baseUrl + 'configuration-manager/update-process-configuration',payload);
  // }

  public getErrorSummmary(){
    return this.http.get(environment.baseUrl + 'process-manager/get-error-summary');
  }

  public ProcessWellboreForMSA(wellboreId: any): Observable<any> {
    return this.http.post(environment.baseUrl + 'MSAProcessor/Process-Wellbore-MSA', 
      JSON.stringify(wellboreId), 
      { headers: { 'Content-Type': 'application/json' } } 
    );
  }
  
  
  
}
