export interface MetricRecord {
  name: string;
  help: string;
  type: "counter" | "gauge" | "histogram";
  values: Map<string, number>;
}

export class MetricsService {
  private metrics: Map<string, MetricRecord> = new Map();
  private startTime: number = Date.now();

  constructor() {
    this.initDefaultMetrics();
  }

  private initDefaultMetrics() {
    this.createMetric("http_requests_total", "Total HTTP requests received", "counter");
    this.createMetric("http_requests_2xx_total", "Total HTTP 2xx successful responses", "counter");
    this.createMetric("http_requests_4xx_total", "Total HTTP 4xx client error responses", "counter");
    this.createMetric("http_requests_5xx_total", "Total HTTP 5xx server error responses", "counter");
    this.createMetric("http_request_duration_ms_total", "Total HTTP request duration in milliseconds", "counter");
    this.createMetric("http_slow_requests_total", "Total slow HTTP requests exceeding threshold", "counter");
    this.createMetric("rate_limit_rejections_total", "Total HTTP 429 rate limit rejections", "counter");
    this.createMetric("search_requests_total", "Total search queries executed", "counter");
    this.createMetric("search_cache_hits_total", "Total search cache hits from Redis", "counter");
    this.createMetric("search_cache_misses_total", "Total search cache misses falling back to database", "counter");
    this.createMetric("notification_jobs_processed_total", "Total BullMQ notification jobs processed", "counter");
    this.createMetric("notification_jobs_failed_total", "Total BullMQ notification jobs failed", "counter");
    this.createMetric("notification_jobs_retried_total", "Total BullMQ notification jobs retried", "counter");
    this.createMetric("socket_connections_total", "Total Socket.IO client connections established", "counter");
    this.createMetric("socket_disconnections_total", "Total Socket.IO client disconnections", "counter");
    this.createMetric("active_worker_jobs", "Currently active BullMQ worker jobs", "gauge");
  }

  public createMetric(name: string, help: string, type: "counter" | "gauge" | "histogram") {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        help,
        type,
        values: new Map(),
      });
    }
  }

  public increment(name: string, labels: Record<string, string> = {}, value: number = 1) {
    const metric = this.metrics.get(name);
    if (!metric) return;

    const labelKey = this.formatLabels(labels);
    const current = metric.values.get(labelKey) || 0;
    metric.values.set(labelKey, current + value);
  }

  public setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const metric = this.metrics.get(name);
    if (!metric) return;

    const labelKey = this.formatLabels(labels);
    metric.values.set(labelKey, value);
  }

  public observe(name: string, value: number, labels: Record<string, string> = {}) {
    this.increment(name, labels, value);
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return "";
    return entries.map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`).join(",");
  }

  public getMetricsJSON() {
    const result: Record<string, unknown> = {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      metrics: {},
    };

    const metricsMap: Record<string, unknown> = {};

    this.metrics.forEach((metric, name) => {
      if (metric.values.size === 1 && metric.values.has("")) {
        metricsMap[name] = metric.values.get("") || 0;
      } else {
        const valObj: Record<string, number> = {};
        metric.values.forEach((v, k) => {
          valObj[k || "default"] = v;
        });
        metricsMap[name] = valObj;
      }
    });

    result.metrics = metricsMap;
    return result;
  }

  public toPrometheusText(): string {
    const lines: string[] = [];
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    lines.push(`# HELP process_uptime_seconds Application process uptime in seconds`);
    lines.push(`# TYPE process_uptime_seconds gauge`);
    lines.push(`process_uptime_seconds ${uptimeSec}`);
    lines.push("");

    this.metrics.forEach((metric) => {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.values.size === 0) {
        lines.push(`${metric.name} 0`);
      } else {
        metric.values.forEach((value, labelStr) => {
          if (labelStr) {
            lines.push(`${metric.name}{${labelStr}} ${value}`);
          } else {
            lines.push(`${metric.name} ${value}`);
          }
        });
      }
      lines.push("");
    });

    return lines.join("\n");
  }

  public resetMetrics() {
    this.metrics.forEach((metric) => metric.values.clear());
    this.startTime = Date.now();
  }
}

export const metricsService = new MetricsService();
