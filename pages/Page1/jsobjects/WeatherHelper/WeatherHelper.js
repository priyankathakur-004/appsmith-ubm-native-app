export default {
    getTimeSeriesConfig() {
        const data = fetch_analytics_data.data || [];
        const monthly = {};

        data.forEach(r => {

            const m = String(r.time_period);

            if (!monthly[m])
                monthly[m] = {
                    cdd: 0,
                    hdd: 0,
                    cons: 0,
                    cnt: 0
                };

            monthly[m].cdd += parseFloat(r.total_cdd) || 0;
            monthly[m].hdd += parseFloat(r.total_hdd) || 0;
            monthly[m].cons += parseFloat(r.consumption) || 0;
            monthly[m].cnt++;

        });

        const months = Object.keys(monthly)
            .sort((a, b) => new Date(a) - new Date(b));

        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const labels = months.map(m => {
            const p = m.split("-");
            return names[p[1] - 1] + " " + p[0];
        });

        return {
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['Total CDD', 'Total HDD', 'Average Consumption'],
                top: 4
            },
            grid: {
                left: '6%',
                right: '7%',
                bottom: '12%',
                top: '8%'
            },
            xAxis: {
                type: 'category',
                data: labels,
                axisLabel: {
                    rotate: 45,
                    margin: 6
                }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'CDD & HDD',
                    nameGap: 10
                },
                {
                    type: 'value',
                    name: 'Avg Consumption',
                    axisLabel: {
                        formatter: v => {
                            if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
                            if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
                            return v;
                        }
                    }
                }

            ],
            series: [
                {
                    name: 'Total CDD',
                    type: 'bar',
                    stack: 'dd',
                    barWidth: 22,
                    barGap: '0%',
                    itemStyle: {
                        color: '#ef4444'
                    },
                    data: months.map(m => monthly[m].cdd)
                },
                {
                    name: 'Total HDD',
                    type: 'bar',
                    stack: 'dd',
                    barWidth: 22,
                    barGap: '0%',
                    itemStyle: {
                        color: '#3b82f6'
                    },
                    data: months.map(m => monthly[m].hdd)
                },
                {
                    name: 'Average Consumption',
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    symbolSize: 6,
                    lineStyle: {
                        color: '#000',
                        width: 3
                    },
                    itemStyle: {
                        color: '#000'
                    },

                    data: months.map(m =>
                        monthly[m].cnt > 0 ?
                        Math.round(monthly[m].cons / monthly[m].cnt) :
                        0)

                }
            ]

        };

    },

    pearson(x, y) {
        const n = x.length;
        if (n < 3) return 0;
        const mx = x.reduce((a, b) => a + b, 0) / n;
        const my = y.reduce((a, b) => a + b, 0) / n;
        let num = 0,
            dx2 = 0,
            dy2 = 0;

        for (let i = 0; i < n; i++) {
            const dx = x[i] - mx;
            const dy = y[i] - my;
            num += dx * dy;
            dx2 += dx * dx;
            dy2 += dy * dy;

        }

        const den = Math.sqrt(dx2 * dy2);
        return den === 0 ? 0 : num / den;

    },

    getCorrelationConfig() {
        const data = fetch_analytics_data.data || [];
        const locData = {};
        data.forEach(r => {
            const lid = r.location_id;
            if (!locData[lid])
                locData[lid] = {
                    name: r.location_description,
                    dd: [],
                    cons: []
                };
            locData[lid].dd.push(parseFloat(r.total_dd) || 0);
            locData[lid].cons.push(parseFloat(r.consumption) || 0);

        });

        const corrs = [];
			
        Object.values(locData).forEach(l => {
            if (l.dd.length >= 3) {
                corrs.push({
                    name: l.name,
                    value: Math.round(
                        this.pearson(l.dd, l.cons) * 100
                    ) / 100
                });
            }
        });

        corrs.sort((a, b) => b.value - a.value);

        return {
            tooltip: {
                trigger: 'axis'
            },
            grid: {
                left: '24%',
                right: '4%',
                bottom: '6%',
                top: '4%'
            },
            xAxis: {
                type: 'value',
                min: 1,
                max: 1
            },
            yAxis: {
                type: 'category',
                inverse: true,
                axisLabel: {
                    fontSize: 10
                },
                data: corrs.map(c => c.name)
            },
            series: [
                {
                    type: 'bar',
                    barMaxWidth: 24,
                    itemStyle: {
                        color: '#3b82f6'
                    },
                    data: corrs.map(c => c.value)
                }
            ]
        };
    },

    getScatterConfig() {
        const data = fetch_analytics_data.data || [];
        const locSeries = {};
        
			data.forEach(r => {
            const loc = r.location_description;

            if (!locSeries[loc]) locSeries[loc] = [];

            locSeries[loc].push([
                parseFloat(r.total_dd) || 0,
                parseFloat(r.consumption) || 0
            ]);
        });

        const colors = [
            '#60a5fa', '#1d4ed8', '#fbbf24', '#4ade80',
            '#059669', '#166534', '#6366f1', '#374151',
            '#ef4444', '#1e40af', '#f97316', '#a855f7',
            '#14b8a6', '#ec4899', '#84cc16', '#0ea5e9'
        ];

        const series = [];
        let i = 0;

        Object.keys(locSeries).forEach(name => {
            series.push({
                name: name,
                type: 'scatter',
                symbolSize: 6,
                itemStyle: {
                    color: colors[i % colors.length]
                },
                data: locSeries[name]
            });
            i++;
        });

        return {
            tooltip: {
                trigger: 'item'
            },
            legend: {
                type: 'scroll',
                orient: 'vertical',
                right: 0,
                top: 8,
                height: 220
            },
            grid: {
                left: '8%',
                right: '14%',
                bottom: '10%',
                top: '6%'
            },
            xAxis: {
                type: 'value',
                name: 'Degree Days',
                nameGap: 18
            },
            yAxis: {
                type: 'value',
                name: 'Consumption',

                axisLabel: {
                    formatter: v => {
                        if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
                        if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
                        return v;
                    }
                }
            },
            series: series
        };
    },

		getTimeSeriesTable() {
        const data = fetch_analytics_data.data || [];
        const monthly = {};

        data.forEach(r => {
            const m = String(r.time_period);
            if (!monthly[m]) monthly[m] = {
                cdd: 0,
                hdd: 0,
                cons: 0,
                cnt: 0
            };
            monthly[m].cdd += parseFloat(r.total_cdd) || 0;
            monthly[m].hdd += parseFloat(r.total_hdd) || 0;
            monthly[m].cons += parseFloat(r.consumption) || 0;
            monthly[m].cnt++;
        });

        const months = Object.keys(monthly).sort((a, b) => new Date(a) - new Date(b));
        return months.map(m => ({
            month: m,
            total_cdd: monthly[m].cdd,
            total_hdd: monthly[m].hdd,
            avg_consumption: monthly[m].cnt > 0 ? Math.round(monthly[m].cons / monthly[m].cnt) : 0
        }));
    },

    getCorrelationTable() {
        const data = fetch_analytics_data.data || [];
        const locData = {};

        data.forEach(r => {
            const lid = r.location_id;
            if (!locData[lid]) locData[lid] = {
                name: r.location_description,
                dd: [],
                cons: []
            };
            locData[lid].dd.push(parseFloat(r.total_dd) || 0);
            locData[lid].cons.push(parseFloat(r.consumption) || 0);
        });

        const rows = [];
        Object.values(locData).forEach(l => {
            if (l.dd.length >= 3) {
                const corr = this.pearson(l.dd, l.cons);
                if (corr > 0) {
                    rows.push({
                        location: l.name,
                        correlation: Math.round(corr * 100) / 100
                    });
                }
            }
        });

        return rows.sort((a, b) => b.correlation - a.correlation);
    },

    getScatterTable() {
        const data = fetch_analytics_data.data || [];
        return data.map(r => ({
            location: r.location_description,
            degree_days: parseFloat(r.total_dd) || 0,
            consumption: parseFloat(r.consumption) || 0,
            month: r.time_period
        }));
    }
};