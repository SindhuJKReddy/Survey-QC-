export interface Survey {
    id: string
    wellboreStateId: string
    surveyStatus: number
    errors: Error[]
    comment: string
    dTimStn: Value
    typeTrajStation: Value
    measuredDepth: Value
    tvd: Value
    inclination: Value
    calculatedInclination: Value
    deltaInclination: Value
    surveyType: Value
    azimuth: Value
    longCollarAzimuth: Value
    shortCollarAzimuth: Value
    toolCode: Value
    calculatedAzimuth: Value
    deltaAzimuth: Value
    magneticToolface: Value
    gravityToolface: Value
    dispNS: Value
    dispEW: Value
    verticalSection: Value
    dogLegSeverity: Value
    rateTurn: Value
    rateBuild: Value
    gravAccelCorUsed: Value
    magXAxialCorUsed: Value
    sagCorUsed: Value
    magDrlstrCorUsed: Value
    gravTotalFieldReference: Value
    magTotalFieldReference: Value
    magDipAngleReference: Value
    statusTrajStation: Value
    surveyAmbStat: Value
    survDisplayStat: Value
    gravAxialRaw: Value
    gravTran1Raw: Value
    gravTran2Raw: Value
    magAxialRaw: Value
    magTran1Raw: Value
    magTran2Raw: Value
    stnMagDeclUsed: Value
    stnGridConUsed: Value
    magTotalFieldCalc: Value
    magDipAngleCalc: Value
    gravTotalFieldCalc: Value
    latitude: Value
    longitude: Value
    easting: Value
    northing: Value
    localX: Value
    localY: Value
    dTimCreation: Value
    dTimLastChange: Value
    itemState: Value
    defaultDatum: Value
    arcSinMethAz1: Value
    arcSinMethAz2: Value
    triacMethAz1: Value
    triacMethAz2: Value
    triacMethAz3: Value
    triacErrMeas1: Value
    triacErrMeas2: Value
    triacErrMeas3: Value
    azimuthAmb1: Value
    errMeasAmb1: Value
    azimuthAmb2: Value
    errMeasAmb2: Value
    logName: Value
    ifR1ShortCollarAzimuth:Value
    ifR1LongCollarAzimuth:Value,
    msaSolutionAz:Value,
    msaSolutionInc:Value,
    msaSolutionBt:Value,
    msaSolutionGt:Value,
    msaSolutionDip:Value,
    msaService:Value,
    msaComments:Value,
    overrideToolCode:number,
  }
  
  export interface Error {
    surveyErrorEnum: number
    errorMessages: string
  }
  
  export interface Value {
    value: string
    valueUnit: string
  }
  
  