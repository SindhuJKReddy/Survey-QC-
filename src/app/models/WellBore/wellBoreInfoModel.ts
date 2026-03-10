export interface WellboreInfo {
  id: string;
  wellboreInfoId: string;
  wellboreInfo: WellboreDetails;
  totalSurveys: number;
  processSummary: ProcessSummary[];
  lastSurveyReceivedTime: string;
}

export interface WellboreDetails {
  id: string;
  wellId: ValueUnit;
  wellboreId: ValueUnit;
  customerName: ValueUnit;
  latitude: ValueUnitNumeric;
  longitude: ValueUnitNumeric;
  serviceCompanyInfos: ServiceCompanyInfos;
}

export interface ValueUnit {
  value: string | null;
  valueUnit: string;
}

export interface ValueUnitNumeric {
  value: number | null;
  valueUnit: string;
}

export interface ProcessSummary {
  totalSurveys: number;
  totalAutoRejectedSurveys: number;
  totalAutoApprovedSurveys: number;
  totalUserApprovedSurveys: number;
  totalUserRejectedSurveys: number;
  totalUnknownSurveys: number;
  name: string;
}

export interface ServiceCompanyInfos {
  [key: string]: ServiceCompanyInfo;
}

export interface ServiceCompanyInfo {
  name: string;
  serviceCompany: ValueUnit | null;
  azimuthReference: ValueUnit | null;
  magneticDeclinationUsed: ValueUnit | null;
  gridConvergenceUsed: ValueUnit | null;
  azimuthVerticalSection: ValueUnit | null;
}
