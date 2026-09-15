const AnalyticsService = require('../services/analytics.service');

class AnalyticsController {
    static async analyticsPage(req, res) {
        try {
            res.render('admin/analytics', {
                title: 'Analytics Dashboard',
                sidebar: true,
                isGenie: true,
                page: 'admin-analytics',
                user: req.user
            });
        } catch (err) {
            res.status(500).render('error', {
                title: 'Server Error',
                message: err.message,
                error: null,
                redirect_url: '/',
                header: false,
                footer: false
            });
        }
    }

    static async dashboardData(req, res) {
        try {
            const startDate = req.query.startDate || '30daysAgo';
            const endDate = req.query.endDate || 'today';
            const data = await AnalyticsService.getDashboardData(startDate, endDate);

            return res.json({
                success: true,
                data
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message || 'Unable to load analytics data'
            });
        }
    }

    static async realtime(req, res) {
        try {
            const response = await AnalyticsService.getRealtimeUsers();
            const value = Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);

            return res.json({
                success: true,
                data: { realtimeUsers: value }
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message || 'Unable to load realtime analytics data'
            });
        }
    }

    static async summary(req, res) {
        try {
            const response = await AnalyticsService.getWebsiteStats();
            const rows = response.rows || [];
            const current = rows[0]?.metricValues || [];
            const previous = rows[1]?.metricValues || [];

            return res.json({
                success: true,
                data: {
                    activeUsers: Number(current[0]?.value || 0),
                    sessions: Number(current[1]?.value || 0),
                    pageViews: Number(current[2]?.value || 0),
                    previous: {
                        activeUsers: Number(previous[0]?.value || 0),
                        sessions: Number(previous[1]?.value || 0),
                        pageViews: Number(previous[2]?.value || 0)
                    }
                }
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message || 'Unable to load analytics summary'
            });
        }
    }

    static async topPages(req, res) {
        try {
            const response = await AnalyticsService.getTopPages();
            const rows = (response.rows || []).map((row) => ({
                path: row.dimensionValues?.[0]?.value || 'Unknown',
                pageViews: Number(row.metricValues?.[0]?.value || 0)
            }));

            return res.json({ success: true, data: rows });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message || 'Unable to load top pages'
            });
        }
    }

    static async devices(req, res) {
        try {
            const response = await AnalyticsService.getDeviceStats();
            const rows = (response.rows || []).map((row) => ({
                device: row.dimensionValues?.[0]?.value || 'Unknown',
                activeUsers: Number(row.metricValues?.[0]?.value || 0)
            }));

            return res.json({ success: true, data: rows });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message || 'Unable to load device stats'
            });
        }
    }

    static async countries(req, res) {
        try {
            const response = await AnalyticsService.getCountryStats();
            const rows = (response.rows || []).map((row) => ({
                country: row.dimensionValues?.[0]?.value || 'Unknown',
                activeUsers: Number(row.metricValues?.[0]?.value || 0)
            }));

            return res.json({ success: true, data: rows });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message || 'Unable to load country stats'
            });
        }
    }

    static async traffic(req, res) {
        try {
            const response = await AnalyticsService.getTrafficSources();
            const rows = (response.rows || []).map((row) => ({
                source: row.dimensionValues?.[0]?.value || 'Unknown',
                sessions: Number(row.metricValues?.[0]?.value || 0)
            }));

            return res.json({ success: true, data: rows });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message || 'Unable to load traffic sources'
            });
        }
    }

    static async monthly(req, res) {
        try {
            const response = await AnalyticsService.getMonthlyComparison();
            const rows = (response.rows || []).map((row) => ({
                activeUsers: Number(row.metricValues?.[0]?.value || 0)
            }));

            return res.json({
                success: true,
                data: {
                    thisMonth: rows[0]?.activeUsers || 0,
                    lastMonth: rows[1]?.activeUsers || 0
                }
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message || 'Unable to load monthly comparison'
            });
        }
    }
}

module.exports = AnalyticsController;
