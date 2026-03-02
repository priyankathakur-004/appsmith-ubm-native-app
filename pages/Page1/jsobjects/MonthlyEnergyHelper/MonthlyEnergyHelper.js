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
		const selectedUOM = uom || appsmith.store.mecUOM || 'BTU';
		if (selectedUOM === 'Wh') return baseBTU * 0.29307107;
		if (selectedUOM === 'Joule') return baseBTU * 1055.06;
		return baseBTU;
	},

	getUOMLabel() {
		const uom = appsmith.store.mecUOM || 'BTU';
		if (uom === 'Wh') return 'Watt hour';
		if (uom === 'Joule') return 'Joule';
		return 'mmBTU';
	},

	getActiveView() {
		return appsmith.store.mecActiveView || 'Consumption';
	},

	getChartType() {
		return appsmith.store.mecChartType || 'scatter';
	},

	getChartTitle() {
		const view = this.getActiveView();
		const uomLabel = this.getUOMLabel();
		const titles = {
			'Consumption': 'Monthly energy consumption by location',
			'UnitCost': 'Monthly unit cost by location',
			'EnergyUseIntensity': 'Monthly energy use intensity by location'
		};
		return titles[view] || titles['Consumption'];
	},

	getLocationOptions() {
		const raw = fetch_analytics_data.data || [];
		const locs = new Set();
		raw.forEach(r => {
			const loc = r.location_description || 'Unknown';
			locs.add(loc);
		});
		return Array.from(locs).sort().map(loc => ({ label: loc, value: loc }));
	},

	getSelectedLocations() {
		const widget = appsmith.widgets.MECLocCheckbox;
		if (widget && widget.selectedValues && widget.selectedValues.length > 0) {
			return widget.selectedValues;
		}
		return this.getLocationOptions().map(o => o.value);
	},

	getMonthlyData() {
		const raw = fetch_analytics_data.data || [];
		const uom = appsmith.store.mecUOM || 'BTU';
		const selectedLocs = this.getSelectedLocations();
		const byLocMonth = {};

		raw.forEach(r => {
			const loc = r.location_description || 'Unknown';
			if (!selectedLocs.includes(loc)) return;

			const date = r.bill_start_date || r.read_date || '';
			const month = date.substring(0, 7);
			if (!month) return;

			if (!byLocMonth[loc]) byLocMonth[loc] = {};
			if (!byLocMonth[loc][month]) byLocMonth[loc][month] = { consumption: 0, charges: 0, sqft: parseFloat(r.square_feet) || 0 };

			const factor = this.getBTUConversionFactor(r.utility_type, uom);
			const cons = parseFloat(r.consumption) || 0;
			byLocMonth[loc][month].consumption += (cons * factor) / 1000000;
			byLocMonth[loc][month].charges += parseFloat(r.total_charges) || 0;
		});

		return byLocMonth;
	},

	getMonthlyChartConfig() {
		const byLocMonth = this.getMonthlyData();
		const view = this.getActiveView();
		const chartType = this.getChartType();
		const uomLabel = this.getUOMLabel();

		const allMonths = new Set();
		Object.values(byLocMonth).forEach(months => {
			Object.keys(months).forEach(m => allMonths.add(m));
		});
		const sortedMonths = Array.from(allMonths).sort();

		const monthLabels = sortedMonths.map(m => {
			const parts = m.split('-');
			const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
			return monthNames[parseInt(parts[1])-1] + ' ' + parts[0].substring(2);
		});

		const colors = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1','#14B8A6','#E11D48','#A855F7','#0EA5E9','#D946EF'];

		const locations = Object.keys(byLocMonth).sort();
		const series = locations.map((loc, idx) => {
			const data = sortedMonths.map(m => {
				const d = (byLocMonth[loc] || {})[m];
				if (!d) return null;
				let val = d.consumption;
				if (view === 'UnitCost') val = d.charges;
				if (view === 'EnergyUseIntensity') val = d.sqft > 0 ? d.consumption / d.sqft : 0;
				return Number(val.toFixed(2));
			});
			return {
				name: loc,
				type: chartType,
				data: data,
				symbolSize: chartType === 'scatter' ? 10 : 6,
				itemStyle: { color: colors[idx % colors.length] },
				lineStyle: chartType === 'line' ? { width: 2 } : undefined
			};
		});

		let yLabel = 'Equivalent Energy Consumption (' + uomLabel + ')';
		if (view === 'UnitCost') yLabel = 'Total Charges ($)';
		if (view === 'EnergyUseIntensity') yLabel = 'Energy Use Intensity (' + uomLabel + '/sqft)';

		return {
			backgroundColor: 'transparent',
			tooltip: {
				trigger: chartType === 'scatter' ? 'item' : 'axis',
				backgroundColor: '#1e293b',
				borderColor: '#334155',
				textStyle: { color: '#e2e8f0' }
			},
			legend: {
				type: 'scroll',
				bottom: 0,
				textStyle: { color: '#e2e8f0', fontSize: 11 },
				pageTextStyle: { color: '#94a3b8' },
				pageIconColor: '#94a3b8',
				pageIconInactiveColor: '#334155'
			},
			grid: { left: 80, right: 30, top: 20, bottom: 60 },
			xAxis: {
				type: 'category',
				data: monthLabels,
				axisLabel: { color: '#94a3b8', rotate: 45, fontSize: 11 },
				axisLine: { lineStyle: { color: '#334155' } },
				splitLine: { show: false }
			},
			yAxis: {
				type: 'value',
				name: yLabel,
				nameLocation: 'middle',
				nameGap: 55,
				nameTextStyle: { color: '#94a3b8', fontSize: 12 },
				axisLabel: {
					color: '#94a3b8',
					formatter: function(v) {
						return v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v;
					}
				},
				axisLine: { lineStyle: { color: '#334155' } },
				splitLine: { lineStyle: { color: '#1e293b' } }
			},
			series: series
		};
	},

	setDefaults() {
		if (!appsmith.store.mecActiveView) storeValue('mecActiveView', 'Consumption');
		if (!appsmith.store.mecChartType) storeValue('mecChartType', 'scatter');
		if (!appsmith.store.mecUOM) storeValue('mecUOM', 'BTU');
	}
}