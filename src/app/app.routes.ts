import { Routes } from '@angular/router';
import { Home } from './Pages/home/home';
import { ViewSurvey } from './Pages/home/view-survey/view-survey';
import { ViewCharts } from './Pages/home/view-charts/view-charts';
import { ViewReport } from './Pages/home/view-report/view-report';
import { PieChart } from './Pages/home/pie-chart/pie-chart';
import { ViewErrorreportSummary } from './Pages/view-errorreport-summary/view-errorreport-summary';
import { ErrorSummaryCharts } from './Pages/home/error-summary-charts/error-summary-charts';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'view-surveys', component: ViewSurvey },
    { path: 'view-charts', component: ViewCharts },
    { path: 'view-report', component: ViewReport },
    { path: 'view-errorreport-summary', component: ViewErrorreportSummary },
    { path: 'vendors-charts', component: PieChart },
    { path: 'error-summary', component: ErrorSummaryCharts }
];
