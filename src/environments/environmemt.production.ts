export const environment = {
    userauthentication: false,
    isLogEnabled: true,
    envMode: "offline",
    witsmlUrl: window.location.protocol + "//" + 'VSC-MS-17' + ":54502/api/v1/",
    baseUrl: window.location.protocol + "//" + 'VSC-MS-17' + ":54501/api/v1/",
    signalRUrl: window.location.protocol + "//" + 'VSC-MS-17' + ":54501/ServerRealtimeService/",
    appInsights: {      instrumentationKey: 'be3fb1fb-4e60-4391-b6d4-cf36c761df0c'    },
    ISSUER: 'https://myappstest.halliburton.com/oauth2/aus11t15hl51Rz5kM0h8',
    CLIENT_ID: '0oa11t135bpobmObG0h8',
    LOGIN_REDIRECT_URI: window.location.origin + '/login/callback',
    scopes: ["openid","profile","email","address","phone","offline_access"],
    pkce: true
};
