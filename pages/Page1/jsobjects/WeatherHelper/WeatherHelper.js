export default {
    isWeatherTab() {
        return ReportSelect.selectedOptionValue === 'weather';
    },

    getFilteredData() {
        const weatherRaw = fetch_weather_attributes.data || [];
        const consumptionRaw = fetch_analytics_data.data || [];
        const dates = DateSelect.selectedOptionValues || [];
        const utility = UtilityTypeSelect.selectedOptionValue;
        const billType = BillTypeSelect.selectedOptionValue;
        const location = LocationSelect.selectedOptionValue;

        let fc = consumptionRaw;
        if (dates.length > 0) fc = fc.filter(function(r) { return dates.includes(String(r.time_period)); });
        if (utility && utility !== 'All') fc = fc.filter(function(r) { return r.utility_type === utility; });
        if (billType && billType !== 'All') fc = fc.filter(function(r) { return r.bill_type === billType; });
        if (location && location !== 'All') fc = fc.filter(function(r) { return String(r.location_id) === String(location); });

        let fw = weatherRaw;
        if (dates.length > 0) fw = fw.filter(function(r) { return dates.includes(String(r.date_month)); });
        if (location && location !== 'All') fw = fw.filter(function(r) { return String(r.location_id) === String(location); });

        return { weather: fw, consumption: fc };
    },

    getTimeSeriesConfig() {
        var self = this;
        var d = self.getFilteredData();
        var monthly = {};

        d.weather.forEach(function(row) {
            var m = String(row.date_month);
            if (!monthly[m]) monthly[m] = { cdd: 0, hdd: 0, cons: 0, cnt: 0 };
            var n = (row.attribute_name || '').toLowerCase();
            var v = parseFloat(row.attribute_value) || 0;
            if (n.indexOf('cdd') >= 0 || n.indexOf('cooling') >= 0) monthly[m].cdd += v;
            if (n.indexOf('hdd') >= 0 || n.indexOf('heating') >= 0) monthly[m].hdd += v;
        });

        d.consumption.forEach(function(row) {
            var m = String(row.time_period);
            if (!monthly[m]) monthly[m] = { cdd: 0, hdd: 0, cons: 0, cnt: 0 };
            monthly[m].cons += parseFloat(row.consumption) || 0;
            monthly[m].cnt++;
        });

        var months = Object.keys(monthly).sort();
        var labels = months.map(function(m) {
            var parts = m.split('-');
            var mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return mn[parseInt(parts[1],10)-1] + ' ' + parts[0];
        });

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: ['Total CDD','Total HDD','Average Consumption'], top: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
            grid: { left: '8%', right: '10%', bottom: '22%', top: '14%' },
            xAxis: { type: 'category', data: labels, axisLabel: { rotate: 50, color: '#94a3b8', fontSize: 9 }, axisLine: { lineStyle: { color: '#334155' } } },
            yAxis: [
                { type: 'value', name: 'Total CDD and Total HDD', nameTextStyle: { color: '#94a3b8', fontSize: 11 }, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
                { type: 'value', name: 'Average Consumption', nameTextStyle: { color: '#94a3b8', fontSize: 11 }, axisLabel: { color: '#94a3b8', formatter: function(v) { return v >= 1000 ? (v/1000).toFixed(0)+'K' : v; } }, splitLine: { show: false } }
            ],
            series: [
                { name: 'Total CDD', type: 'bar', stack: 'dd', data: months.map(function(m){return monthly[m].cdd;}), itemStyle: { color: '#ef4444' } },
                { name: 'Total HDD', type: 'bar', stack: 'dd', data: months.map(function(m){return monthly[m].hdd;}), itemStyle: { color: '#3b82f6' } },
                { name: 'Average Consumption', type: 'line', yAxisIndex: 1, data: months.map(function(m){return monthly[m].cnt>0 ? Math.round(monthly[m].cons/monthly[m].cnt) : 0;}), lineStyle: { color: '#e2e8f0', width: 2 }, itemStyle: { color: '#e2e8f0' }, symbol: 'circle', symbolSize: 5 }
            ]
        };
    },

    pearson(x, y) {
        var n = x.length;
        if (n < 3) return 0;
        var mx = 0, my = 0;
        for (var i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
        mx /= n; my /= n;
        var num = 0, dx2 = 0, dy2 = 0;
        for (var i = 0; i < n; i++) {
            var a = x[i] - mx, b = y[i] - my;
            num += a * b; dx2 += a * a; dy2 += b * b;
        }
        var den = Math.sqrt(dx2 * dy2);
        return den === 0 ? 0 : num / den;
    },

    getCorrelationConfig() {
        var self = this;
        var d = self.getFilteredData();

        var cIdx = {};
        d.consumption.forEach(function(r) {
            var k = r.location_id + '|' + r.time_period;
            if (!cIdx[k]) cIdx[k] = 0;
            cIdx[k] += parseFloat(r.consumption) || 0;
        });

        var wIdx = {};
        d.weather.forEach(function(r) {
            var k = r.location_id + '|' + r.date_month;
            if (!wIdx[k]) wIdx[k] = 0;
            wIdx[k] += parseFloat(r.attribute_value) || 0;
        });

        var locs = {};
        d.consumption.forEach(function(r) { locs[r.location_id] = r.location_description || ('Site ' + r.location_id); });

        var corrs = [];
        Object.keys(locs).forEach(function(lid) {
            var months = {};
            d.consumption.filter(function(r){return String(r.location_id)===String(lid);}).forEach(function(r){months[r.time_period]=true;});
            var dd = [], cv = [];
            Object.keys(months).forEach(function(m) {
                var ck = lid + '|' + m, wk = lid + '|' + m;
                if (cIdx[ck] !== undefined && wIdx[wk] !== undefined) {
                    dd.push(wIdx[wk]);
                    cv.push(cIdx[ck]);
                }
            });
            if (dd.length >= 3) {
                corrs.push({ name: locs[lid], value: Math.round(self.pearson(dd, cv) * 100) / 100 });
            }
        });

        corrs.sort(function(a,b) { return b.value - a.value; });

        return {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: '22%', right: '5%', bottom: '10%', top: '8%' },
            xAxis: { type: 'value', min: -1, max: 1, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } } },
            yAxis: { type: 'category', data: corrs.map(function(c){return c.name;}), inverse: true, axisLabel: { color: '#94a3b8', fontSize: 11, width: 80, overflow: 'truncate' } },
            series: [{ type: 'bar', data: corrs.map(function(c){return c.value;}), itemStyle: { color: '#3b82f6', borderRadius: [0,3,3,0] }, barMaxWidth: 20 }],
            dataZoom: [{ type: 'slider', yAxisIndex: 0, filterMode: 'none', width: 12, right: 0, startValue: 0, endValue: Math.min(corrs.length-1, 14) }]
        };
    },

    getScatterConfig() {
        var self = this;
        var d = self.getFilteredData();

        var pts = {};
        d.consumption.forEach(function(r) {
            var k = (r.location_description||'Unknown') + '|' + r.time_period;
            if (!pts[k]) pts[k] = { loc: r.location_description||'Unknown', cons: 0, dd: 0, hasW: false };
            pts[k].cons += parseFloat(r.consumption) || 0;
        });
        d.weather.forEach(function(r) {
            var k = (r.location_description||'Unknown') + '|' + r.date_month;
            if (pts[k]) { pts[k].dd += parseFloat(r.attribute_value) || 0; pts[k].hasW = true; }
        });

        var locSeries = {};
        Object.values(pts).forEach(function(p) {
            if (!p.hasW) return;
            if (!locSeries[p.loc]) locSeries[p.loc] = [];
            locSeries[p.loc].push([p.dd, p.cons]);
        });

        var colors = ['#60a5fa','#1d4ed8','#fbbf24','#4ade80','#059669','#166534','#6366f1','#374151','#ef4444','#1e40af','#f97316','#a855f7','#14b8a6','#ec4899','#84cc16','#0ea5e9','#d946ef','#fb923c'];
        var series = [];
        var i = 0;
        Object.keys(locSeries).forEach(function(name) {
            series.push({ name: name, type: 'scatter', data: locSeries[name], symbolSize: 7, itemStyle: { color: colors[i % colors.length] } });
            i++;
        });

        return {
            tooltip: { trigger: 'item' },
            legend: { type: 'scroll', orient: 'vertical', right: 0, top: '10%', textStyle: { color: '#94a3b8', fontSize: 9 }, pageTextStyle: { color: '#94a3b8' } },
            grid: { left: '10%', right: '16%', bottom: '18%', top: '8%' },
            xAxis: { type: 'value', name: 'Average of Total Degree Days', nameLocation: 'center', nameGap: 30, nameTextStyle: { color: '#94a3b8', fontSize: 12 }, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } } },
            yAxis: { type: 'value', name: 'Average Consumption', nameTextStyle: { color: '#94a3b8', fontSize: 12 }, axisLabel: { color: '#94a3b8', formatter: function(v) { if(v>=1000000) return (v/1000000).toFixed(1)+'M'; if(v>=1000) return (v/1000).toFixed(0)+'K'; return v; } }, splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } } },
            series: series
        };
    }
}