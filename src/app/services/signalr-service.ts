import { computed, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { 
  HubConnection, 
  HubConnectionBuilder, 
  HubConnectionState, 
  LogLevel 
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api'; // PrimeNG v20 Service
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  // Connection state in signals with observable compatibility for existing subscribers.
  private readonly connectionEstablishedSignal = signal(false);
  public readonly connectionEstablished = this.connectionEstablishedSignal.asReadonly();
  public readonly connectionEstablished$ = toObservable(this.connectionEstablishedSignal);

  private readonly isServerConnectedSignal = signal(false);
  public readonly isServerConnected = this.isServerConnectedSignal.asReadonly();
  public readonly isServerConnected$ = toObservable(this.isServerConnectedSignal);

  public readonly connectionStatusText = computed(() =>
    this.isServerConnectedSignal() ? 'Connected' : 'Disconnected'
  );

  // Data Streams (Replacing EventEmitters with Subjects for service-level logic)
  public surveyCountNotification = new Subject<any>();
  public wellboreProcessState = new Subject<any>();
  public wellboreSurveysCounts = new Subject<any>();

  private connection!: HubConnection;
  private readonly signalRUrl: string = environment.signalRUrl;

  constructor(private messageService: MessageService) {
    this.initSignalR();
  }

  /**
   * Initializes the SignalR Hub connection with automatic retry logic
   */
  private initSignalR(): void {
    if (environment.envMode === 'offline') {
      console.warn('SignalR: Skipped connection because envMode is offline.');
      this.updateState(false);
      return;
    }

    this.connection = new HubConnectionBuilder()
      .withUrl(this.signalRUrl)
      .withAutomaticReconnect([0, 2000, 10000, 30000, 60000]) // Specific retry intervals
      .configureLogging(LogLevel.Information)
      .build();

    this.setupLifecycleHooks();
    this.setupEventListeners();
    this.startConnection();
  }

  /**
   * SignalR lifecycle hooks for monitoring connectivity
   */
  private setupLifecycleHooks(): void {
    this.connection.onreconnecting((error) => {
      console.warn('SignalR: Connection lost. Reconnecting...', error);
      this.updateState(false);
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR: Connection restored. ID:', connectionId);
      this.updateState(true);
    });

    this.connection.onclose((error) => {
      console.error('SignalR: Connection closed permanently.', error);
      this.updateState(false);
      // Optional: Trigger manual restart after a minute if automatic fails
      setTimeout(() => this.startConnection(), 60000);
    });
  }

  /**
   * Starts the connection to the hub
   */
  private async startConnection(): Promise<void> {
    if (this.connection.state !== HubConnectionState.Disconnected) {
      return;
    }

    try {
      await this.connection.start();
      console.log('SignalR: Connection started successfully.');
      this.updateState(true);
    } catch (error) {
      console.error('SignalR: Error while starting connection:', error);
      this.updateState(false);
      setTimeout(() => this.startConnection(), 5000); // Retry logic for initial failure
    }
  }

  /**
   * Updates internal subjects and localStorage state
   */
  private updateState(isConnected: boolean): void {
    this.connectionEstablishedSignal.set(isConnected);
    this.isServerConnectedSignal.set(isConnected);
    localStorage.setItem('isServerConnected', String(isConnected));
  }

  /**
   * Setup listeners for server-side events
   */
  private setupEventListeners(): void {
    this.connection.on("OnSurveyCount", count => {
      this.surveyCountNotification.next(count);
    });

    this.connection.on("OnWellboreProcessState", wellState => {
      this.wellboreProcessState.next(wellState);
    });

    this.connection.on("SystemSummaryInformation", (wellboreId: string, value: any) => {
      this.wellboreSurveysCounts.next({ wellboreId, value });
    });

    this.connection.on("OnSurveysUpdated", (wellId: string) => {
      this.showNotification('success', 'MSA Updated', `MSA Updated for ${wellId}`);
      console.log('SignalR: OnSurveysUpdated received for:', wellId);
    });
  }

  /**
   * Helper to check current connection status
   */
  public isConnected(): boolean {
    return this.connection.state === HubConnectionState.Connected;
  }

  /**
   * Wrapper for PrimeNG MessageService notifications
   */
  public showNotification(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({
      severity,
      summary,
      detail,
      life: 5000 // Display for 5 seconds
    });
  }
}