import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { HealthResponse, LatestResponse, ESGAnalyticsResponse } from '../../models/api.models';
import { Chart, registerables } from 'chart.js';
import { catchError, map, of } from 'rxjs';
import { timeout } from 'rxjs/operators';

Chart.register(...registerables);

interface ParsedItem {
  icon: string;
  label: string;
  text: string;
  severity: 'high' | 'medium' | 'low' | 'info';
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],    styles: [`
      .insights-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }
      .insight-card {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        transition: all 0.3s ease;
      }
      .insight-card:hover {
        transform: translateY(-2px);
        border-color: rgba(99, 102, 241, 0.4);
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);
      }
      .insight-number {
        min-width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #6366f1, #06b6d4);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        color: white;
        flex-shrink: 0;
      }
      .insight-content {
        flex: 1;
      }
      .insight-title {
        font-weight: 600;
        color: #e2e8f0;
        font-size: 14px;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .insight-title .material-icons {
        font-size: 16px;
        color: #6366f1;
      }
      .insight-text {
        color: #94a3b8;
        font-size: 13px;
        line-height: 1.5;
      }
      .insight-card.high {
        border-left: 3px solid #ef4444;
      }
      .insight-card.medium {
        border-left: 3px solid #f59e0b;
      }
      .insight-card.low {
        border-left: 3px solid #10b981;
      }
      .insight-card.info {
        border-left: 3px solid #6366f1;
      }
      
      /* Risks styles */
      .risk-card {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        transition: all 0.3s ease;
      }
      .risk-card:hover {
        transform: translateY(-2px);
        border-color: rgba(239, 68, 68, 0.4);
        box-shadow: 0 8px 24px rgba(239, 68, 68, 0.15);
      }
      .risk-number {
        min-width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #ef4444, #f97316);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        color: white;
        flex-shrink: 0;
      }
      .risk-title .material-icons {
        font-size: 16px;
        color: #ef4444;
      }
      .risk-card.critical {
        border-left: 3px solid #dc2626;
      }
      .risk-card.high {
        border-left: 3px solid #ef4444;
      }
      .risk-card.medium {
        border-left: 3px solid #f59e0b;
      }
      .risk-card.low {
        border-left: 3px solid #10b981;
      }
      
      /* Recommendations styles */
      .rec-card {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%);
        border: 1px solid rgba(16, 185, 129, 0.2);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        transition: all 0.3s ease;
      }
      .rec-card:hover {
        transform: translateY(-2px);
        border-color: rgba(16, 185, 129, 0.4);
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
      }
      .rec-number {
        min-width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #10b981, #06b6d4);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        color: white;
        flex-shrink: 0;
      }
      .rec-title .material-icons {
        font-size: 16px;
        color: #10b981;
      }
      .rec-card.priority-high {
        border-left: 3px solid #10b981;
      }
      .rec-card.priority-medium {
        border-left: 3px solid #06b6d4;
      }
      .rec-card.priority-low {
        border-left: 3px solid #8b5cf6;
      }
      
      .ai-sections-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 24px;
        margin-top: 24px;
      }
      @media (min-width: 1200px) {
        .ai-sections-grid {
          grid-template-columns: 1fr 1fr 1fr;
        }
      }
    `],
    template: `
    <div class="dashboard">
      <header class="page-header">
        <div>
          <h1>GovernIQ</h1>
          <p>AI-powered decision support for workforce, CSR, campaigns, and leadership action.</p>
        </div>
      </header>

      <!-- Status Cards -->
      <div class="grid grid-3 stats-grid">
        <div class="stat-card">
          <div class="stat-row">
            <div class="stat-icon esg">
              <span class="material-icons">eco</span>
            </div>
            <div class="stat-content">
              <span class="stat-label">CSR</span>
              <span class="stat-value">Active</span>
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-row">
            <div class="stat-icon dei">
              <span class="material-icons">diversity_3</span>
            </div>
            <div class="stat-content">
              <span class="stat-label">Workforce</span>
              <span class="stat-value">Active</span>
            </div>
          </div>
        </div>
        <div class="stat-card" [class.warning]="stats.overdueCount > 0">
          <div class="stat-row">
            <div class="stat-icon overdue">
              <span class="material-icons">warning</span>
            </div>
            <div class="stat-content">
              <span class="stat-label">Overdue Items</span>
              <span class="stat-value">{{ stats.overdueCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Insights, Risks, and Recommendations -->
      <div class="ai-sections-grid">
        <!-- Insights Section -->
        <section class="ai-section">
          <div class="ai-section-header">
            <div class="ai-section-title-row">
              <span class="material-icons section-icon insight-icon">lightbulb</span>
              <h2>Insights</h2>
            </div>
          </div>
          <div class="ai-section-body">
            <button class="ask-ai-btn" (click)="generateInsights()" [disabled]="insightsLoading">
              <span class="material-icons">smart_toy</span>
              Generate
            </button>
            <div *ngIf="insightsLoading" class="loading-msg">
              <span class="material-icons spin">autorenew</span> Analyzing...
            </div>
            <div class="insights-grid" *ngIf="!insightsLoading && insightsItems.length">
              <div *ngFor="let item of insightsItems; let i = index" 
                   class="insight-card" [ngClass]="item.severity">
                <div class="insight-number">{{ i + 1 }}</div>
                <div class="insight-content">
                  <div class="insight-title">
                    <span class="material-icons">{{ item.icon }}</span>
                    {{ item.label }}
                  </div>
                  <div class="insight-text">{{ item.text }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Risks Section -->
        <section class="ai-section">
          <div class="ai-section-header">
            <div class="ai-section-title-row">
              <span class="material-icons section-icon" style="color: #ef4444;">warning</span>
              <h2>Risks</h2>
            </div>
          </div>
          <div class="ai-section-body">
            <button class="ask-ai-btn" (click)="generateRisks()" [disabled]="risksLoading" style="background: linear-gradient(135deg, #ef4444, #f97316);">
              <span class="material-icons">security</span>
              Generate
            </button>
            <div *ngIf="risksLoading" class="loading-msg">
              <span class="material-icons spin">autorenew</span> Analyzing risks...
            </div>
            <div class="insights-grid" *ngIf="!risksLoading && risksItems.length">
              <div *ngFor="let item of risksItems; let i = index" 
                   class="risk-card" [ngClass]="item.severity">
                <div class="risk-number">{{ i + 1 }}</div>
                <div class="insight-content">
                  <div class="insight-title risk-title">
                    <span class="material-icons">{{ item.icon }}</span>
                    {{ item.label }}
                  </div>
                  <div class="insight-text">{{ item.text }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Recommendations Section -->
        <section class="ai-section">
          <div class="ai-section-header">
            <div class="ai-section-title-row">
              <span class="material-icons section-icon" style="color: #10b981;">recommend</span>
              <h2>Recommendations</h2>
            </div>
          </div>
          <div class="ai-section-body">
            <button class="ask-ai-btn" (click)="generateRecommendations()" [disabled]="recsLoading" style="background: linear-gradient(135deg, #10b981, #06b6d4);">
              <span class="material-icons">tips_and_updates</span>
              Generate
            </button>
            <div *ngIf="recsLoading" class="loading-msg">
              <span class="material-icons spin">autorenew</span> Generating recommendations...
            </div>
            <div class="insights-grid" *ngIf="!recsLoading && recsItems.length">
              <div *ngFor="let item of recsItems; let i = index" 
                   class="rec-card" [ngClass]="item.severity">
                <div class="rec-number">{{ i + 1 }}</div>
                <div class="insight-content">
                  <div class="insight-title rec-title">
                    <span class="material-icons">{{ item.icon }}</span>
                    {{ item.label }}
                  </div>
                  <div class="insight-text">{{ item.text }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('esgChart') esgChartRef!: ElementRef<HTMLCanvasElement>;

    health: HealthResponse | null = null;
    latestBrief: string | null = null;
    hasChartData = false;
    analytics: ESGAnalyticsResponse | null = null;
    activeTab: 'weekly' | 'monthly' = 'weekly';
    dateFrom = '';
    dateTo = '';
    features: { name: string; enabled: boolean }[] = [];
    trendSummary: { up: number; down: number; same: number } | null = null;
    private chart: Chart | null = null;

    // Per-section AI state
    insightsLoading = false;
    insightsItems: ParsedItem[] = [];
    
    risksLoading = false;
    risksItems: ParsedItem[] = [];
    
    recsLoading = false;
    recsItems: ParsedItem[] = [];

    stats = {
        esgMetrics: 0,
        deiMetrics: 0,
        initiatives: 0,
        overdueCount: 0
    };

    constructor(private api: ApiService, private router: Router) { }

    ngOnInit() {
        // Default date range: last 90 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90);
        this.dateFrom = start.toISOString().split('T')[0];
        this.dateTo = end.toISOString().split('T')[0];

        this.loadHealth();
        this.loadLatest();
        this.loadStats();
    }

    ngAfterViewInit() {
        this.loadESGTrends();
    }

    ngOnDestroy() {
        this.chart?.destroy();
    }    generateInsights() {
      this.insightsLoading = true;
      this.insightsItems = [];
      // Call backend API to get insights from uploaded sustainability file (handled in backend)
      this.api.getInsights('esg')
        .pipe(timeout(15000))
        .subscribe({
          next: (res: { success: boolean; insights: string; raw_response: string }) => {
            this.insightsItems = this.parseInsightsToPoints(res.insights || 'No insights available.');
            this.insightsLoading = false;
          },
          error: (_err: any) => {
            this.insightsItems = [{
              icon: 'error_outline',
              label: 'Data Required',
              text: 'Unable to load insights. Please upload a sustainability file first.',
              severity: 'medium'
            }];
            this.insightsLoading = false;
          }
        });
    }

    private parseInsightsToPoints(text: string): ParsedItem[] {
      // Try to split by numbered points (1., 2., etc.) or bullet points
      const numberedPattern = /(?:^|\n)\s*(?:\d+[\.\)]\s*|\*\s*|-\s*|•\s*)/;
      let points = text.split(numberedPattern).filter(p => p.trim().length > 0);
      
      // If no numbered points found, split by sentences or newlines
      if (points.length <= 1) {
        points = text.split(/\.\s+|\n+/).filter(p => p.trim().length > 10);
      }
      
      // Take up to 5 points
      points = points.slice(0, 5);
      
      // If still only one point, break it into smaller chunks
      if (points.length === 1 && text.length > 200) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        points = sentences.slice(0, 5);
      }

      const icons = ['trending_up', 'eco', 'analytics', 'lightbulb', 'insights'];
      const labels = ['Key Trend', 'Sustainability', 'Analysis', 'Recommendation', 'Insight'];
      const severities: ('high' | 'medium' | 'low' | 'info')[] = ['info', 'low', 'medium', 'info', 'low'];

      return points.map((point, index) => ({
        icon: icons[index % icons.length],
        label: labels[index % labels.length],
        text: point.trim().replace(/^[\d\.\)\*\-•]+\s*/, ''),
        severity: severities[index % severities.length]
      }));
    }

    generateRisks() {
      this.risksLoading = true;
      this.risksItems = [];
      this.api.getRisks('all')
        .pipe(timeout(15000))
        .subscribe({
          next: (res: { success: boolean; risks: string; raw_response: string }) => {
            this.risksItems = this.parseRisksToPoints(res.risks || 'No risks identified.');
            this.risksLoading = false;
          },
          error: (_err: any) => {
            this.risksItems = [{
              icon: 'error_outline',
              label: 'Data Required',
              text: 'Unable to analyze risks. Please upload data files first.',
              severity: 'medium'
            }];
            this.risksLoading = false;
          }
        });
    }

    private parseRisksToPoints(text: string): ParsedItem[] {
      const numberedPattern = /(?:^|\n)\s*(?:\d+[\.\)]\s*|\*\s*|-\s*|•\s*)/;
      let points = text.split(numberedPattern).filter(p => p.trim().length > 0);
      
      if (points.length <= 1) {
        points = text.split(/\.\s+|\n+/).filter(p => p.trim().length > 10);
      }
      
      points = points.slice(0, 5);
      
      if (points.length === 1 && text.length > 200) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        points = sentences.slice(0, 5);
      }

      const icons = ['warning', 'report_problem', 'error', 'dangerous', 'shield'];
      const labels = ['Critical Risk', 'High Priority', 'Compliance Risk', 'Operational Risk', 'Strategic Risk'];
      const severities: ('high' | 'medium' | 'low' | 'info')[] = ['high', 'high', 'medium', 'medium', 'low'];

      return points.map((point, index) => ({
        icon: icons[index % icons.length],
        label: labels[index % labels.length],
        text: point.trim().replace(/^[\d\.\)\*\-•]+\s*/, ''),
        severity: severities[index % severities.length]
      }));
    }

    generateRecommendations() {
      this.recsLoading = true;
      this.recsItems = [];
      this.api.getRecommendations('all')
        .pipe(timeout(15000))
        .subscribe({
          next: (res: { success: boolean; recommendations: string; raw_response: string }) => {
            this.recsItems = this.parseRecommendationsToPoints(res.recommendations || 'No recommendations available.');
            this.recsLoading = false;
          },
          error: (_err: any) => {
            this.recsItems = [{
              icon: 'error_outline',
              label: 'Data Required',
              text: 'Unable to generate recommendations. Please upload data files first.',
              severity: 'medium'
            }];
            this.recsLoading = false;
          }
        });
    }

    private parseRecommendationsToPoints(text: string): ParsedItem[] {
      const numberedPattern = /(?:^|\n)\s*(?:\d+[\.\)]\s*|\*\s*|-\s*|•\s*)/;
      let points = text.split(numberedPattern).filter(p => p.trim().length > 0);
      
      if (points.length <= 1) {
        points = text.split(/\.\s+|\n+/).filter(p => p.trim().length > 10);
      }
      
      points = points.slice(0, 5);
      
      if (points.length === 1 && text.length > 200) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        points = sentences.slice(0, 5);
      }

      const icons = ['rocket_launch', 'auto_awesome', 'tips_and_updates', 'thumb_up', 'task_alt'];
      const labels = ['Quick Win', 'Strategic Action', 'Best Practice', 'Improvement', 'Next Step'];
      const severities: ('high' | 'medium' | 'low' | 'info')[] = ['low', 'info', 'low', 'medium', 'info'];

      return points.map((point, index) => ({
        icon: icons[index % icons.length],
        label: labels[index % labels.length],
        text: point.trim().replace(/^[\d\.\)\*\-•]+\s*/, ''),
        severity: severities[index % severities.length]
      }));
    }

    loadHealth() {
        this.api.getHealth().subscribe({
            next: (health) => {
                this.health = health;
                this.features = [
                    { name: 'Meeting Summarization', enabled: health.features.deterministic_briefs },
                    { name: 'AI Intelligence', enabled: health.features.ai_briefs },
                    { name: 'Conversational Chat', enabled: health.features.chat },
                    { name: 'RAG (Vector Search)', enabled: health.features.rag },
                    { name: 'Anomaly Detection', enabled: health.features.anomaly_detection }
                ];
            },
            error: () => this.health = null
        });
    }

    loadStats() {
        this.api.getStats().subscribe({
            next: (stats) => {
                this.stats = {
                    esgMetrics: stats.esg_metrics,
                    deiMetrics: stats.dei_metrics,
                    initiatives: stats.initiatives,
                    overdueCount: stats.overdue_count
                };
            },
            error: () => {
                // Keep default zeros on error
            }
        });
    }

    loadLatest() {
        this.api.getLatest().subscribe({
            next: (latest) => this.latestBrief = latest.last_brief_generated,
            error: () => this.latestBrief = null
        });
    }

    applyDateFilter() {
        this.loadESGTrends();
    }

    loadESGTrends() {
        this.api.getESGAnalytics(this.dateFrom, this.dateTo).subscribe({
            next: (data) => {
                this.analytics = data;
                const hasWeekly = data.weekly_pct_change?.length > 0;
                const hasMonthly = data.monthly_accumulated?.length > 0;
                if (!hasWeekly && !hasMonthly) return;
                this.hasChartData = true;
                this.trendSummary = {
                    up: (data.weekly_trend || []).filter(t => t.trend === 'up').length,
                    down: (data.weekly_trend || []).filter(t => t.trend === 'down').length,
                    same: (data.weekly_trend || []).filter(t => t.trend === 'same').length,
                };
                this.buildChart(data);
            },
            error: () => {
                this.hasChartData = false;
            }
        });
    }

    private buildChart(data: ESGAnalyticsResponse) {
        this.chart?.destroy();
        const ctx = this.esgChartRef.nativeElement.getContext('2d');
        if (!ctx) return;

        if (this.activeTab === 'weekly') {
            this.buildWeeklyChart(ctx, data);
        } else {
            this.buildMonthlyChart(ctx, data);
        }
    }

    private buildWeeklyChart(ctx: CanvasRenderingContext2D, data: ESGAnalyticsResponse) {
        const items = data.weekly_pct_change || [];
        const labels = items.map(w => `W${w.week} '${String(w.year).slice(2)}`);
        const values = items.map(w => w.pct_change);
        const trends = data.weekly_trend || [];

        const canvasH = ctx.canvas.offsetHeight || 300;
        const canvasW = ctx.canvas.offsetWidth || 600;

        // Wave fill gradient: green above zero, red below
        const fillGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
        fillGrad.addColorStop(0,    'rgba(52, 211, 153, 0.40)');
        fillGrad.addColorStop(0.45, 'rgba(52, 211, 153, 0.08)');
        fillGrad.addColorStop(0.55, 'rgba(251, 113, 133, 0.08)');
        fillGrad.addColorStop(1,    'rgba(251, 113, 133, 0.35)');

        // Line gradient: indigo → cyan across width
        const lineGrad = ctx.createLinearGradient(0, 0, canvasW, 0);
        lineGrad.addColorStop(0,   '#a5b4fc');
        lineGrad.addColorStop(0.5, '#6366f1');
        lineGrad.addColorStop(1,   '#06b6d4');

        // Point colors per trend
        const pointBg = items.map((_, i) => {
            const t = trends[i]?.trend;
            if (t === 'up')   return '#34d399';
            if (t === 'down') return '#fb7185';
            return '#a5b4fc';
        });

        const tickColor = 'rgba(148,163,184,0.7)';
        const gridColor = 'rgba(255,255,255,0.05)';

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: '% Change',
                    data: values,
                    borderColor: lineGrad,
                    backgroundColor: fillGrad,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.5,
                    spanGaps: true,
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    pointBackgroundColor: pointBg,
                    pointBorderColor: 'rgba(15,23,42,0.8)',
                    pointBorderWidth: 2,
                    pointHoverBorderColor: '#e2e8f0',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeInOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(99,102,241,0.4)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            title: (i) => i[0].label,
                            label: (item) => {
                                const val = item.parsed.y;
                                const trend = trends[item.dataIndex]?.trend ?? '';
                                const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
                                if (val === null) return `${arrow}  N/A (baseline week)`;
                                return `${arrow}  ${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: tickColor, font: { size: 12, weight: 500 } }
                    },
                    y: {
                        grid: { color: gridColor, drawTicks: false },
                        border: { display: false },
                        ticks: {
                            color: tickColor,
                            padding: 8,
                            callback: (value) => `${value}%`
                        }
                    }
                }
            }
        });
    }

    private buildMonthlyChart(ctx: CanvasRenderingContext2D, data: ESGAnalyticsResponse) {
        const items = data.monthly_accumulated || [];
        const labels = items.map(m => `${m.month_name.slice(0, 3)} ${m.year}`);
        const values = items.map(m => m.value);

        const canvasH = ctx.canvas.offsetHeight || 360;
        const canvasW = ctx.canvas.offsetWidth || 600;

        const fillGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
        fillGrad.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
        fillGrad.addColorStop(0.65, 'rgba(6, 182, 212, 0.1)');
        fillGrad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        const lineGrad = ctx.createLinearGradient(0, 0, canvasW, 0);
        lineGrad.addColorStop(0, '#6366f1');
        lineGrad.addColorStop(1, '#06b6d4');

        const tickColor = 'rgba(148,163,184,0.7)';
        const gridColor = 'rgba(255,255,255,0.05)';

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Accumulated',
                    data: values,
                    borderColor: lineGrad,
                    backgroundColor: fillGrad,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.42,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#1e1b4b',
                    pointBorderColor: '#a5b4fc',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#6366f1',
                    pointHoverBorderColor: '#e0e7ff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 700, easing: 'easeInOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(99,102,241,0.4)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            label: (item) => `  Accumulated: ${(item.parsed.y ?? 0).toLocaleString()}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: tickColor, font: { size: 12, weight: 500 } }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: gridColor, drawTicks: false },
                        border: { display: false },
                        ticks: {
                            color: tickColor,
                            padding: 8,
                            callback: (value) => Number(value).toLocaleString()
                        }
                    }
                }
            }
        });
    }
}
