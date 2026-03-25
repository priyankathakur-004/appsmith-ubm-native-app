export default {
	getLocationOptions() {
		const raw = fetch_analytics_data.data || [];
		const locs = new Set();

		raw.forEach(r => {
			locs.add((r.location_description || "Unknown").trim());
		});

		return Array.from(locs)
			.sort()
			.map(loc => ({ label: loc, value: loc }));
	},

	getSelectedLocations() {
		const locs = appsmith.store.otySelectedLocation;

		if (Array.isArray(locs) && locs.length) {
			return locs.map(l => l.trim());
		}

		return this.getLocationOptions().map(o => o.value);
	},

	getViewBy() {
		return appsmith.store.otyViewBy || "Location";
	},

	getMapMarkers() {
		const raw = fetch_analytics_data.data || [];
		const selectedLocs = this.getSelectedLocations();
		const markers = {};

		raw.forEach(r => {
			const loc = (r.location_description || "Unknown").trim();

			if (!selectedLocs.some(l => l === loc)) return;

			const lat = Number(r.latitude);
			const lng = Number(r.longitude);

			if (!isNaN(lat) && !isNaN(lng) && !markers[loc]) {
				markers[loc] = {
					lat,
					long: lng,
					title: loc,
					color: "#3B82F6"
				};
			}
		});

		return Object.values(markers);
	},

	getYearlyMonthlyData() {
		const raw = fetch_analytics_data.data || [];
		const selectedLocs = this.getSelectedLocations();
		const result = {};

		const MIN_CONSUMPTION = 0; // remove noisy data

		raw.forEach(r => {
			const loc = (r.location_description || "Unknown").trim();
			if (!selectedLocs.some(l => l === loc)) return;

			const dateStr = r.time_period || '';
			if (!dateStr) return;

			// SAFE DATE PARSE
			const parts = dateStr.split("-");
			const year = Number(parts[0]);
			const month = Number(parts[1]);

			if (!year || !month) return;

			const charges = parseFloat(r.total_charges);
			const consumption = parseFloat(r.consumption);

			// FILTER BAD DATA
			if (isNaN(consumption) || consumption < MIN_CONSUMPTION) return;
			if (isNaN(charges) || charges <= 0) return;

			if (!result[year]) result[year] = {};
			if (!result[year][month]) {
				result[year][month] = {
					charges: 0,
					consumption: 0,
					unitCost: 0
				};
			}

			result[year][month].charges += charges;
			result[year][month].consumption += consumption;
		});

		// CALCULATE UNIT COST
		Object.keys(result).forEach(year => {
			Object.keys(result[year]).forEach(month => {
				const d = result[year][month];

				if (d.consumption > 0 && d.charges > 0) {
					const uc = d.charges / d.consumption;
					d.unitCost = uc > 1 ? 0 : uc; // cap spikes
				} else {
					d.unitCost = 0;
				}
			});
		});

		return result;
	},

	buildLineChart(valueKey) {
		const data = this.getYearlyMonthlyData();

		const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

		// REMOVE INCOMPLETE YEARS
		const years = Object.keys(data)
			.map(y => Number(y))
			.filter(y => Object.keys(data[y]).length >= 1)
			.sort((a, b) => b - a)
			.slice(0, 5);

		const colors = ["#3B82F6","#F9A8D4","#86efac","#F59E0B","#8B5CF6"];

		const series = years.map((year, idx) => ({
			name: String(year),
			type: "line",
			smooth: true,
			data: months.map((_, i) => {
				const d = data[year]?.[i + 1];
				return d ? Number(d[valueKey].toFixed(2)) : 0;
			}),
			itemStyle: { color: colors[idx % colors.length] },
			lineStyle: { width: 2, color: colors[idx % colors.length] },
			connectNulls: true
		}));

		return {
			backgroundColor: "#1E293B",

			tooltip: {
				trigger: "axis",
				backgroundColor: "#0F172A",
				textStyle: { color: "#E2E8F0" }
			},

			legend: {
				right: 10,
				top: 5,
				orient: "vertical",
				textStyle: { color: "#E2E8F0" },
				data: years.map(String)
			},

			grid: { left: 60, right: 100, top: 20, bottom: 30 },

			xAxis: {
				type: "category",
				data: months,
				axisLabel: { color: "#CBD5E1" },
				axisLine: { lineStyle: { color: "#475569" } }
			},

			yAxis: {
				type: "value",
				axisLabel: { color: "#CBD5E1" },
				splitLine: { lineStyle: { color: "#334155", type: "dashed" } }
			},

			series
		};
	},

	getChargesChartConfig() {
		return this.buildLineChart("charges");
	},

	getUnitCostChartConfig() {
		return this.buildLineChart("unitCost");
	},

	getConsumptionChartConfig() {
		return this.buildLineChart("consumption");
	},

	setDefaults() {
		if (!appsmith.store.otyViewBy) {
			storeValue("otyViewBy", "Location");
		}
	}
};
