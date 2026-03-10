export interface FacLimit {
    azimuthQCLimits: Qclimits
    inclinationQCLimits: Qclimits
    bTotalQCLimits: Qclimits
    gTotalQCLimits: Qclimits
    dipQCLimits: Qclimits
  }
  
  export interface Qclimits {
    checkThreshold: boolean
    threshold: number
    unit: string
  }