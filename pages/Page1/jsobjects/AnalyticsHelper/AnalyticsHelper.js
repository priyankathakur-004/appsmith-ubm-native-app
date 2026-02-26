export default {
    getActiveView() {
        return appsmith.store.activeView || 'Charges';
    },

    getChartTitle() {
        const view = this.getActiveView();
        const titles = {
            'Charges': 'Charges ($)',
            'Consumption': 'Consumption',
            'Unit Cost': 'Unit Cost ($/unit)',
            'Demand': 'Demand (kW)',
            'Load Factor': 'Load Factor'
        };
        return titles[view] || 'Charges ($)';
    },

    getInfoText() {
        const view = this.getActiveView();
        const texts = {
            'Charges': '\u24D8 Charges are additive across multiple utility types and bill types.',
            'Consumption': '\u24D8 Consumption is additive across multiple utility types and bill types.',
            'Unit Cost': '\u24D8 Unit cost is calculated as total charges divided by total consumption.',
            'Demand': '\u24D8 Demand values shown for electric accounts only.',
            'Load Factor': '\u24D8 Load factor values shown for electric accounts only.'
        };
        return texts[view] || '';
    },

    getFilteredData() {
        const data = fetch_analytics_data.data || [];
        const dates = DateSelect.selectedOptionValues || [];
        const utility = UtilityTypeSelect.selectedOptionValue;
        const billType = BillTypeSelect.selectedOptionValue;
        const location = LocationSelect.selectedOptionValue;
        const attrName = LocationAttrSelect.selectedOptionValue;
        const attrValue = AttrChoiceSelect.selectedOptionValue;

        let filtered = data;

        if (dates.length > 0) {
            filtered = filtered.filter(r => dates.includes(String(r.time_period)));
        }
        if (utility && utility !== 'All') {
            filtered = filtered.filter(r => r.utility_type === utility);
        }
        if (billType && billType !== 'All') {
            filtered = filtered.filter(r => r.bill_type === billType);
        }
        if (location && location !== 'All') {
            filtered = filtered.filter(r => String(r.location_id) === String(location));
        }
        if (attrName && attrName !== 'All' && attrValue && attrValue !== 'All') {
            const attrLocations = (fetch_attribute_values.data || []).map(r => r.location_id).filter(Boolean);
            if (attrLocations.length > 0) {
                filtered = filtered.filter(r => attrLocations.includes(r.location_id));
            }
        }

        return filtered;
    },

    getChartConfig() {
        const view = this.getActiveView();
        const data = this.getFilteredData();
        const demandData = fetch_demand_loadfactor.data || [];

        const locationMap = {};
        data.forEach(row => {
            const loc = row.location_description || 'Unknown';
            if (!locationMap[loc]) {
                locationMap[loc] = { charges: 0, consumption: 0, demand: 0, loadFactor: 0, count: 0, locationId: row.location_id };
            }
            locationMap[loc].charges += parseFloat(row.total_charges) || 0;
            locationMap[loc].consumption += parseFloat(row.consumption) || 0;
            locationMap[loc].count++;
        });

        if (view === 'Demand' || view === 'Load Factor') {
            demandData.forEach(row => {
                const loc = row.location_description || 'Unknown';
                if (!locationMap[loc]) {
                    locationMap[loc] = { charges: 0, consumption: 0, demand: 0, loadFactor: 0, count: 0, locationId: row.location_id };
                }
                locationMap[loc].demand += parseFloat(row.demand) || 0;
                if (parseFloat(row.load_factor) > 0) {
                    locationMap[loc].loadFactor = parseFloat(row.load_factor);
                }
            });
        }

        Object.keys(locationMap).forEach(loc => {
            const d = locationMap[loc];
            d.unitCost = d.consumption > 0 ? d.charges / d.consumption : 0;
        });

        const metricKey = {
            'Charges': 'charges',
            'Consumption': 'consumption',
            'Unit Cost': 'unitCost',
            'Demand': 'demand',
            'Load Factor': 'loadFactor'
        }[view] || 'charges';

        const sorted = Object.entries(locationMap)
            .sort((a, b) => (b[1][metricKey] || 0) - (a[1][metricKey] || 0));

        const labels = sorted.map(function(item) { return item[0]; });
        const values = sorted.map(function(item) { return Math.round((item[1][metricKey] || 0) * 100) / 100; });

        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            grid: { left: '15%', right: '5%', bottom: '12%', top: '5%', containLabel: false },
            xAxis: {
                type: 'value',
                axisLabel: {
                    formatter: function(value) {
                        if (view === 'Charges' || view === 'Unit Cost') {
                            if (Math.abs(value) >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
                            if (Math.abs(value) >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
                            return '$' + value.toFixed(0);
                        }
                        if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                        if (Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'K';
                        return value.toFixed(0);
                    }
                },
                splitLine: { lineStyle: { type: 'dashed', color: '#e0e0e0' } }
            },
            yAxis: {
                type: 'category',
                data: labels,
                inverse: true,
                axisLabel: {
                    width: 100,
                    overflow: 'truncate',
                    fontSize: 12
                }
            },
            series: [{
                type: 'bar',
                data: values,
                name: view,
                itemStyle: {
                    color: '#4285f4',
                    borderRadius: [0, 3, 3, 0]
                },
                barMaxWidth: 22
            }],
            dataZoom: [{
                type: 'slider',
                yAxisIndex: 0,
                filterMode: 'none',
                width: 15,
                right: 0,
                startValue: 0,
                endValue: Math.min(labels.length - 1, 24)
            }]
        };
    }
}