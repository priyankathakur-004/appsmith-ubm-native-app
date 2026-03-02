export default {
	getBTUConversionFactor(utilityType, uom) {
		const btuFactors = {
			'ELECTRIC': 3412.14,
			'NATURALGAS': 102800,
			'OIL2': 138500,
			'STEAM': 1000,
			'WATER': 0,
			'SEWER': 0
		};
		const baseBTU = btuFactors[utilityType] || 0;
		const selectedUOM = uom || appsmith.store.ecUOM || 'BTU';
		if (selectedUOM === 'Wh') return baseBTU * 0.29307107;
		if (selectedUOM === 'Joule') return baseBTU * 1055.06;
		return baseBTU;
	},

	getUOMLabel() {
		const uom = appsmith.store.ecUOM || 'BTU';
		if (uom === 'Wh') return 'Watt hour';
		if (uom === 'Joule') return 'Joule';
		return 'mmBTU';
	},

	getActiveView() {
		return appsmith.store.ecActiveView || 'AggregatedConsumption';
	},

	getLeftChartTitle() {
		const view = this.getActiveView();
		const uom = this.getUOMLabel();
		const titles = {
			'AggregatedConsumption': 'Aggregated energy consumption by location',
			'AggregatedUnitCost': 'Aggregated unit cost by location',
			'EnergyUseIntensity': 'Energy use intensity by location'
		};
		return titles[view] || titles['AggregatedConsumption'];
	},

	getRightChartTitle() {
		const view = this.getActiveView();
		const titles = {
			'AggregatedConsumption': 'Aggregated energy consumption by location, account number, meter',
			'AggregatedUnitCost': 'Aggregated unit cost by location, account number, meter',
			'EnergyUseIntensity': 'Energy use intensity by location, account number, meter'
		};
		return titles[view] || titles['AggregatedConsumption'];
	},

	getAggregatedData() {
		const raw = fetch_analytics_data.data || [];
		const uom = appsmith.store.ecUOM || 'BTU';
		const byLocation = {};

		raw.forEach(r => {
			const loc = r.location_description || 'Unknown';
			if (!byLocation[loc]) byLocation[loc] = { consumption: 0, charges: 0, sqft: parseFloat(r.square_feet) || 0 };
			const factor = this.getBTUConversionFactor(r.utility_type, uom);
			const cons = parseFloat(r.consumption) || 0;
			byLocation[loc].consumption += (cons * factor) / 1000000;
			byLocation[loc].charges += parseFloat(r.total_charges) || 0;
		});

		return byLocation;
	},

	getLocationChartConfig() {
		const byLocation = this.getAggregatedData();
		const view = this.getActiveView();
		const uomLabel = this.getUOMLabel();

		const entries = Object.entries(byLocation)
			.map(([loc, d]) => {
				let val = d.consumption;
				if (view === 'AggregatedUnitCost') val = d.charges;
				if (view === 'EnergyUseIntensity') val = d.sqft > 0 ? d.consumption / d.sqft : 0;
				return { name: loc, value: Number(val.toFixed(2)) };
			})
			.sort((a, b) => b.value - a.value);

		let xLabel = 'Equivalent Energy Consumption (' + uomLabel + ')';
		if (view === 'AggregatedUnitCost') xLabel = 'Total Charges ($)';
		if (view === 'EnergyUseIntensity') xLabel = 'Energy Use Intensity (' + uomLabel + '/sqft)';

		return {
			backgroundColor: 'transparent',
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
			grid: { left: 120, right: 40, top: 10, bottom: 50 },
			xAxis: {
				type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 35,
				nameTextStyle: { color: '#94a3b8', fontSize: 12 },
				axisLabel: { color: '#94a3b8', formatter: function(v) { return v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v; } },
				axisLine: { lineStyle: { color: '#334155' } },
				splitLine: { lineStyle: { color: '#1e293b' } }
			},
			yAxis: {
				type: 'category', data: entries.map(e => e.name), inverse: true,
				axisLabel: { color: '#e2e8f0', width: 100, overflow: 'truncate', fontSize: 12 },
				axisLine: { lineStyle: { color: '#334155' } }
			},
			series: [{ type: 'bar', data: entries.map(e => e.value), itemStyle: { color: '#3B82F6', borderRadius: [0, 3, 3, 0] }, barMaxWidth: 18 }]
		};
	},

	getMeterChartConfig() {
		const raw = fetch_analytics_data.data || [];
		const uom = appsmith.store.ecUOM || 'BTU';
		const view = this.getActiveView();
		const uomLabel = this.getUOMLabel();
		const byMeter = {};

		raw.forEach(r => {
			const key = (r.location_description || '') + ', ' + (r.location_id || '');
			if (!byMeter[key]) byMeter[key] = { consumption: 0, charges: 0, sqft: parseFloat(r.square_feet) || 0 };
			const factor = this.getBTUConversionFactor(r.utility_type, uom);
			const cons = parseFloat(r.consumption) || 0;
			byMeter[key].consumption += (cons * factor) / 1000000;
			byMeter[key].charges += parseFloat(r.total_charges) || 0;
		});

		const entries = Object.entries(byMeter)
			.map(([key, d]) => {
				let val = d.consumption;
				if (view === 'AggregatedUnitCost') val = d.charges;
				if (view === 'EnergyUseIntensity') val = d.sqft > 0 ? d.consumption / d.sqft : 0;
				return { name: key.length > 40 ? key.substring(0, 37) + '...' : key, value: Number(val.toFixed(2)) };
			})
			.sort((a, b) => b.value - a.value)
			.slice(0, 8);

		let xLabel = 'Equivalent Energy Consumption (' + uomLabel + ')';
		if (view === 'AggregatedUnitCost') xLabel = 'Total Charges ($)';
		if (view === 'EnergyUseIntensity') xLabel = 'EUI (' + uomLabel + '/sqft)';

		return {
			backgroundColor: 'transparent',
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
			grid: { left: 200, right: 40, top: 10, bottom: 50 },
			xAxis: {
				type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 35,
				nameTextStyle: { color: '#94a3b8', fontSize: 12 },
				axisLabel: { color: '#94a3b8', formatter: function(v) { return v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v; } },
				axisLine: { lineStyle: { color: '#334155' } },
				splitLine: { lineStyle: { color: '#1e293b' } }
			},
			yAxis: {
				type: 'category', data: entries.map(e => e.name), inverse: true,
				axisLabel: { color: '#e2e8f0', width: 180, overflow: 'truncate', fontSize: 11 },
				axisLine: { lineStyle: { color: '#334155' } }
			},
			series: [{ type: 'bar', data: entries.map(e => e.value), itemStyle: { color: '#3B82F6', borderRadius: [0, 3, 3, 0] }, barMaxWidth: 18 }]
		};
	},

	getUtilityPieConfig() {
		const raw = fetch_analytics_data.data || [];
		const uom = appsmith.store.ecUOM || 'BTU';
		const uomLabel = this.getUOMLabel();
		const byType = {};

		raw.forEach(r => {
			const ut = r.utility_type || 'Unknown';
			if (!byType[ut]) byType[ut] = 0;
			const factor = this.getBTUConversionFactor(ut, uom);
			const cons = parseFloat(r.consumption) || 0;
			byType[ut] += (cons * factor) / 1000000;
		});

		const entries = Object.entries(byType).map(([name, value]) => ({
			name: name, value: Number(value.toFixed(2))
		}));

		const total = entries.reduce((s, e) => s + e.value, 0);

		const colors = { 'NATURALGAS': '#86efac', 'ELECTRIC': '#3B82F6', 'OIL2': '#065f46', 'STEAM': '#f59e0b', 'WATER': '#06b6d4' };

		return {
			backgroundColor: 'transparent',
			tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
			legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#e2e8f0', fontSize: 13 },
				formatter: function(name) { return name; } },
			series: [{
				type: 'pie', radius: ['50%', '80%'], center: ['35%', '50%'],
				label: {
					show: true, position: 'outside', color: '#e2e8f0', fontSize: 12,
					formatter: function(p) { return p.value.toFixed(2) + 'M (' + p.percent.toFixed(2) + '%)'; }
				},
				labelLine: { lineStyle: { color: '#64748b' } },
				data: entries,
				color: entries.map(e => colors[e.name] || '#94a3b8'),
				emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } }
			}]
		};
	},

	setDefaults() {
		if (!appsmith.store.ecActiveView) storeValue('ecActiveView', 'AggregatedConsumption');
		if (!appsmith.store.ecUOM) storeValue('ecUOM', 'BTU');
	}
}