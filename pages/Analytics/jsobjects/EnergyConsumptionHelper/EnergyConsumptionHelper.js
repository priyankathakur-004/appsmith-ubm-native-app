export default {

    getBTUConversionFactor(utilityType, uom) {
        const map = {
            ELECTRIC: 3412.14,
            NATURALGAS: 102800,
            OIL2: 138500,
            STEAM: 1000,
            WATER: 0,
            SEWER: 0
        };
        const base = map[utilityType] || 0;
        const u = uom || appsmith.store.ecUOM || "BTU";
        if (u === "Wh") return base * 0.29307107;
        if (u === "Joule") return base * 1055.06;
        return base;
    },

    getUOMLabel() {
        const u = appsmith.store.ecUOM || "BTU";
        if (u === "Wh") return "Watt hour";
        if (u === "Joule") return "Joule";
        return "mmBTU";
    },

    getActiveView() {
        return appsmith.store.ecActiveView || "AggregatedConsumption";
    },

    getLeftChartTitle() {
        const view = this.getActiveView();
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

    _aggregateRaw(keyFn) {
        const raw = fetch_analytics_data.data || [];
				const u = appsmith.store.ecUOM || "BTU";
        const map = {};
        raw.forEach(r => {
            const k = keyFn(r);
            if (!map[k])
                map[k] = { cons: 0, charges: 0, sqft: Number(r.square_feet) || 0, months: new Set() };
            map[k].months.add(r.time_period);
            const f = this.getBTUConversionFactor(r.utility_type, u);

						map[k].cons += ((Number(r.consumption) || 0) * f) / 1000000;
            map[k].charges += Number(r.total_charges) || 0;
        });
        return map;
    },

   _computeValue(d, view) {
			const u = appsmith.store.ecUOM || "BTU";
			const scale = u === "Joule" ? 1 : 1000;
			const months = d.months?.size || 1;

			if (view === "AggregatedUnitCost")
				return d.cons ? (d.charges * 1000) / (d.cons * scale) : 0;

			if (view === "EnergyUseIntensity")
				return d.sqft ? (d.cons * scale) / (months * d.sqft) : 0;

			return u === "Joule" ? d.cons / 1000 : d.cons;
		},
	
    _getXLabel(view, uom) {
        if (view === "AggregatedUnitCost") return "Total Charges ($)";
        if (view === "EnergyUseIntensity") return "EUI (" + uom + "/sqft)";
        return "Equivalent Energy (" + uom + ")";
    },

    _buildBarChart(rows, xlabel, gridLeft, labelWidth) {
        return {
            backgroundColor: "#1E293B",
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                backgroundColor: "#0F172A",
                textStyle: { color: "#E2E8F0" }
            },
            grid: { left: gridLeft, right: gridLeft === "15%" ? "10%" : "5%", top: "5%", bottom: "10%" },
            xAxis: {
                type: "value",
                name: xlabel,
                nameLocation: "middle",
                nameGap: 40,
                nameTextStyle: { color: "#CBD5F5" },
                axisLabel: { color: "#CBD5E1" },
                axisLine: { lineStyle: { color: "#475569" } },
                splitLine: { lineStyle: { color: "#334155" } }
            },
            yAxis: {
                type: "category",
                inverse: true,
                data: rows.map(r => r.name),
                axisLabel: { color: "#E2E8F0", width: labelWidth, overflow: "truncate" },
                axisLine: { show: false },
                axisTick: { show: false }
            },
            series: [{
                type: "bar",
                barWidth: 18,
                itemStyle: { color: "#3B82F6", borderRadius: [0, 4, 4, 0] },
                data: rows.map(r => r.value)
            }]
        };
    },

    getAggregatedData() {
        return this._aggregateRaw(r => r.location_description || "Unknown");
    },

    getLocationChartConfig() {
        const view = this.getActiveView();
        const data = this.getAggregatedData();
        const uom = this.getUOMLabel();

        const rows = Object.entries(data).map(([n, d]) => ({
            name: n,
            value: Number(this._computeValue(d, view).toFixed(2))
        })).sort((a, b) => b.value - a.value);

        return this._buildBarChart(rows, this._getXLabel(view, uom), "15%", 110);
    },

    getMeterChartConfig() {
        const view = this.getActiveView();
        const uom = this.getUOMLabel();
        const data = this._aggregateRaw(r => (r.location_description || "") + " " + (r.location_id || ""));

        const rows = Object.entries(data).map(([n, d]) => ({
            name: n.length > 40 ? n.substring(0, 37) + "..." : n,
            value: Number(this._computeValue(d, view).toFixed(2))
        })).sort((a, b) => b.value - a.value).slice(0, 8);

        return this._buildBarChart(rows, this._getXLabel(view, uom), "25%", 190);
    },

    getUtilityPieConfig() {
        const raw = fetch_analytics_data.data || [];
        const u = appsmith.store.ecUOM || "BTU";
        const map = {};

        raw.forEach(r => {
            const t = r.utility_type || "Unknown";
            if (!map[t]) map[t] = 0;
            map[t] += ((Number(r.consumption) || 0) * this.getBTUConversionFactor(t, u)) / 1000000;
        });

        const colors = {
            NATURALGAS: "#22C55E", ELECTRIC: "#3B82F6", OIL2: "#065F46",
            STEAM: "#F59E0B", WATER: "#06B6D4"
        };

        const rows = Object.entries(map).map(([n, v]) => ({ name: n, value: Number(v.toFixed(2)) }));

        return {
            backgroundColor: "#1E293B",
            tooltip: { trigger: "item", backgroundColor: "#0F172A", textStyle: { color: "#E2E8F0" } },
            legend: { top: "3%", left: "center", textStyle: { color: "#E2E8F0" } },
            series: [{
                type: "pie",
                radius: ["50%", "70%"],
                center: ["50%", "50%"],
                label: {
                    color: "#E2E8F0",
                    formatter: p => p.value.toFixed(2) + "M (" + p.percent.toFixed(1) + "%)"
                },
                labelLine: { lineStyle: { color: "#64748B" } },
                data: rows,
                color: rows.map(r => colors[r.name] || "#94A3B8")
            }]
        };
    },
	
		_getValueLabel(view) {
    if (view === "AggregatedUnitCost") return "Unit Cost";
    if (view === "EnergyUseIntensity") return "Energy Use Intensity";
    return "Consumption";
},

		_getUOMColumnLabel(view) {
				const uom = this.getUOMLabel();
				if (view === "AggregatedUnitCost") return "$/mm" + uom;
				if (view === "EnergyUseIntensity") return uom + "/sqft";
				return uom;
		},

		getLocationTable() {
				const view = this.getActiveView();
				const data = this.getAggregatedData();
				const uomLabel = this._getUOMColumnLabel(view);

				return Object.entries(data)
						.map(([n, d]) => ({
								Location: n,
								[this._getValueLabel(view)]: Number(this._computeValue(d, view).toFixed(2)),
								UOM: uomLabel,
								...(view === "EnergyUseIntensity" ? { "Square Feet": d.sqft } : {})
						}))
						.sort((a, b) => b[this._getValueLabel(view)] - a[this._getValueLabel(view)]);
		},

		getMeterTable() {
				const view = this.getActiveView();
				const data = this._aggregateRaw(r => (r.location_description || "") + " " + (r.location_id || ""));
				const uomLabel = this._getUOMColumnLabel(view);

				return Object.entries(data)
						.map(([n, d]) => ({
								"Location, Service Acct, Meter": n,
								[this._getValueLabel(view)]: Number(this._computeValue(d, view).toFixed(2)),
								UOM: uomLabel,
								...(view === "EnergyUseIntensity" ? { "Square Feet": d.sqft } : {})
						}))
						.sort((a, b) => b[this._getValueLabel(view)] - a[this._getValueLabel(view)]);
		},

		getUtilityTable() {
				const raw = fetch_analytics_data.data || [];
				const u = appsmith.store.ecUOM || "BTU";
				const uom = this.getUOMLabel();
				const map = {};

				raw.forEach(r => {
						const t = r.utility_type || "Unknown";
						if (!map[t]) map[t] = 0;
						map[t] += ((Number(r.consumption) || 0) * this.getBTUConversionFactor(t, u)) / 1000000;
				});

				return Object.entries(map)
						.map(([n, v]) => ({
								Utility: n,
								Value: Number(v.toFixed(2)),
								UOM: uom
						}))
						.sort((a, b) => b.Value - a.Value);
		},

    setDefaults() {
        if (!appsmith.store.ecActiveView) storeValue("ecActiveView", "AggregatedConsumption");
        if (!appsmith.store.ecUOM) storeValue("ecUOM", "BTU");
    }

};
