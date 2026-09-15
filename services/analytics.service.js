// services/analytics.service.js
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
require('dotenv').config();

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const GA_CREDENTIALS = process.env.GA_CREDENTIALS;

let analyticsDataClient = null;

const createAnalyticsClient = () => {
    if (analyticsDataClient) return analyticsDataClient;

    if (!PROPERTY_ID || !GA_CREDENTIALS) {
        return null;
    }

    try {
        analyticsDataClient = new BetaAnalyticsDataClient({
            credentials: JSON.parse(GA_CREDENTIALS),
        });
        return analyticsDataClient;
    } catch (err) {
        console.warn('Analytics credentials are not configured correctly:', err.message);
        return null;
    }
};

const createFallbackResponse = (rows = []) => ({ rows });

const formatDateForGa = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
    if (!value) return null;
    if (value === 'today') return new Date();
    const relativeMatch = value.match(/^(\d+)daysAgo$/i);
    if (relativeMatch) {
        const result = new Date();
        result.setDate(result.getDate() - Number(relativeMatch[1]));
        return result;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return null;
};

const getPreviousRange = (startDate, endDate) => {
    const currentStart = parseDateInput(startDate);
    const currentEnd = parseDateInput(endDate) || new Date();

    if (!currentStart) {
        return { startDate: '60daysAgo', endDate: '31daysAgo' };
    }

    const durationDays = Math.max(1, Math.round((currentEnd - currentStart) / 86400000) + 1);
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - durationDays + 1);

    return {
        startDate: formatDateForGa(previousStart),
        endDate: formatDateForGa(previousEnd)
    };
};

const buildComparison = (current, previous) => ({
    current,
    previous,
    change: previous ? ((current - previous) / previous) * 100 : 0
});

class AnalyticsService {

    static async getWebsiteStats() {
        const client = createAnalyticsClient();
        if (!client) return createFallbackResponse();

        const [response] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [
                { startDate: "7daysAgo", endDate: "today" },
                { startDate: "14daysAgo", endDate: "8daysAgo" },
            ],
            metrics: [
                { name: "activeUsers" },
                { name: "sessions" },
                { name: "screenPageViews" },
            ],
        });

        return response;
    }

    static async getTopPages() {
        const client = createAnalyticsClient();
        if (!client) return createFallbackResponse();

        const [response] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [
                { startDate: "7daysAgo", endDate: "today" },
            ],
            dimensions: [{ name: "pagePath" }],
            metrics: [{ name: "screenPageViews" }],
            limit: 5,
        });

        return response;
    }

    static async getRealtimeUsers() {
        const client = createAnalyticsClient();
        if (!client) return createFallbackResponse();

        const [response] = await client.runRealtimeReport({
            property: `properties/${PROPERTY_ID}`,
            metrics: [{ name: "activeUsers" }],
        });

        return response;
    }

    static async getMonthlyComparison() {
        const client = createAnalyticsClient();
        if (!client) return createFallbackResponse();

        const [response] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [
                { startDate: "30daysAgo", endDate: "today" },
                { startDate: "60daysAgo", endDate: "31daysAgo" }
            ],
            metrics: [{ name: "activeUsers" }],
        });

        return response;
    }

    static async getDeviceStats() {
        const client = createAnalyticsClient();
        if (!client) return createFallbackResponse();

        const [response] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
            dimensions: [{ name: "deviceCategory" }],
            metrics: [{ name: "activeUsers" }],
        });

        return response;
    }

    static async getCountryStats() {
        const client = createAnalyticsClient();
        if (!client) return createFallbackResponse();

        const [response] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
            dimensions: [{ name: "country" }],
            metrics: [{ name: "activeUsers" }],
            limit: 10,
        });

        return response;
    }

    static async getTrafficSources() {
        const client = createAnalyticsClient();
        if (!client) return createFallbackResponse();

        const [response] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }],
        });

        return response;
    }

    static async getDashboardData(startDate, endDate) {
        const client = createAnalyticsClient();
        if (!client) {
            return {
                summary: {
                    activeUsers: 0,
                    sessions: 0,
                    pageViews: 0,
                    realtimeUsers: 0,
                    engagementRate: 0,
                    avgSessionDuration: 0,
                    engagedSessions: 0,
                    pageViewsPerSession: 0
                },
                devices: [],
                countries: [],
                traffic: [],
                monthly: [],
                pages: [],
                trend: [],
                comparison: {
                    activeUsers: buildComparison(0, 0),
                    sessions: buildComparison(0, 0),
                    pageViews: buildComparison(0, 0),
                    engagementRate: buildComparison(0, 0),
                    avgSessionDuration: buildComparison(0, 0),
                    engagedSessions: buildComparison(0, 0),
                    pageViewsPerSession: buildComparison(0, 0)
                }
            };
        }

        const previousRange = getPreviousRange(startDate, endDate);

        const [stats] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate, endDate }, previousRange],
            metrics: [
                { name: "activeUsers" },
                { name: "sessions" },
                { name: "screenPageViews" },
                { name: "engagedSessions" },
                { name: "averageSessionDuration" },
                { name: "engagementRate" },
                { name: "screenPageViewsPerSession" }
            ]
        });

        const [trendResponse] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "date" }],
            metrics: [
                { name: "activeUsers" },
                { name: "sessions" },
                { name: "screenPageViews" }
            ],
            orderBy: [{ dimension: { dimensionName: "date" } }]
        });

        const [devices] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "deviceCategory" }],
            metrics: [{ name: "activeUsers" }]
        });

        const [countries] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "country" }],
            metrics: [{ name: "activeUsers" }],
            limit: 10
        });

        const [traffic] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }]
        });

        const [monthlyResponse] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [
                { startDate, endDate },
                { startDate: "60daysAgo", endDate: "31daysAgo" }
            ],
            metrics: [{ name: "activeUsers" }]
        });

        const [realtime] = await client.runRealtimeReport({
            property: `properties/${PROPERTY_ID}`,
            metrics: [{ name: "activeUsers" }],
        });

        const [pagesResponse] = await client.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "pagePath" }],
            metrics: [{ name: "screenPageViews" }],
            limit: 5,
            orderBy: [{ metric: { metricName: "screenPageViews" }, desc: true }]
        });

        const monthlyRows = [];
        if (monthlyResponse.rows && monthlyResponse.rows.length > 0) {
            const row = monthlyResponse.rows[0];
            monthlyRows.push({ metricValues: [{ value: row.metricValues[0]?.value || '0' }] });
            monthlyRows.push({ metricValues: [{ value: row.metricValues[1]?.value || '0' }] });
        }

        const summaryMetricValues = stats.rows?.[0]?.metricValues || [];
        const previousSummaryMetricValues = stats.rows?.[1]?.metricValues || [];
        const engagementRate = Number(summaryMetricValues[5]?.value || 0) * 100;
        const previousEngagementRate = Number(previousSummaryMetricValues[5]?.value || 0) * 100;
        const avgSessionDuration = Number(summaryMetricValues[4]?.value || 0);
        const previousAvgSessionDuration = Number(previousSummaryMetricValues[4]?.value || 0);
        const engagedSessions = Number(summaryMetricValues[3]?.value || 0);
        const previousEngagedSessions = Number(previousSummaryMetricValues[3]?.value || 0);
        const pageViewsPerSession = Number(summaryMetricValues[6]?.value || 0);
        const previousPageViewsPerSession = Number(previousSummaryMetricValues[6]?.value || 0);

        return {
            summary: {
                activeUsers: Number(summaryMetricValues[0]?.value || 0),
                sessions: Number(summaryMetricValues[1]?.value || 0),
                pageViews: Number(summaryMetricValues[2]?.value || 0),
                realtimeUsers: Number(realtime.rows?.[0]?.metricValues?.[0]?.value || 0),
                engagementRate: Number.isFinite(engagementRate) ? engagementRate : 0,
                avgSessionDuration: Number.isFinite(avgSessionDuration) ? avgSessionDuration : 0,
                engagedSessions: Number.isFinite(engagedSessions) ? engagedSessions : 0,
                pageViewsPerSession: Number.isFinite(pageViewsPerSession) ? pageViewsPerSession : 0
            },
            devices: devices.rows || [],
            countries: countries.rows || [],
            traffic: traffic.rows || [],
            monthly: monthlyRows || [],
            pages: pagesResponse.rows || [],
            trend: (trendResponse.rows || []).map((row) => ({
                date: row.dimensionValues?.[0]?.value || 'Unknown',
                activeUsers: Number(row.metricValues?.[0]?.value || 0),
                sessions: Number(row.metricValues?.[1]?.value || 0),
                pageViews: Number(row.metricValues?.[2]?.value || 0)
            })),
            comparison: {
                activeUsers: buildComparison(Number(summaryMetricValues[0]?.value || 0), Number(previousSummaryMetricValues[0]?.value || 0)),
                sessions: buildComparison(Number(summaryMetricValues[1]?.value || 0), Number(previousSummaryMetricValues[1]?.value || 0)),
                pageViews: buildComparison(Number(summaryMetricValues[2]?.value || 0), Number(previousSummaryMetricValues[2]?.value || 0)),
                engagementRate: buildComparison(engagementRate, previousEngagementRate),
                avgSessionDuration: buildComparison(avgSessionDuration, previousAvgSessionDuration),
                engagedSessions: buildComparison(engagedSessions, previousEngagedSessions),
                pageViewsPerSession: buildComparison(pageViewsPerSession, previousPageViewsPerSession)
            }
        };
    }
}

module.exports = AnalyticsService;