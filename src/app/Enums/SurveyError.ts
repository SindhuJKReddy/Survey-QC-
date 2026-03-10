export enum SurveyError {
    NA = 0,
    MandatoryValuesMissing = 1,
    InclinationQCFailure = 2,
    AzimuthQCFailure = 3,
    GtotalFailure = 4,
    BtotalFailure = 5,
    DipFailure = 6,
    GravityRangeFailure = 7,
    GravityReferenceRangeFailure = 8,
    MagneticRangeFailure = 9,
    MagneticReferenceRangeFailure = 10,
    BGGMMagTotalFieldReferenceFailure = 11,
    BGGMMagDipAngleReferenceFailure = 12,
    BGGMMagDeclFailure = 13
}
