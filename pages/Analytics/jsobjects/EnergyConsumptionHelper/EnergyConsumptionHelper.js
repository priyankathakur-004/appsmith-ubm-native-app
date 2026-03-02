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
        const uom = appsmith.store.ecUOM || "BTU";

        const map = {};

        raw.forEach(r => {

            const loc = r.location_description || "Unknown";

            if (!map[loc])
                map[loc] = {
                    cons: 0,
                    charges: 0,
                    sqft: Number(r.square_feet) || 0
                };

            const f = this.getBTUConversionFactor(r.utility_type, uom);

            map[loc].cons += ((Number(r.consumption) || 0) * f) / 1000000;
            map[loc].charges += Number(r.total_charges) || 0;

        });

        return map;

    },

    getLocationChartConfig() {

        const view = this.getActiveView();
        const data = this.getAggregatedData();
        const uom = this.getUOMLabel();

        const rows = Object.entries(data).map(([n, d]) => {

            let v = d.cons;

            if (view === "AggregatedUnitCost") v = d.charges;
            if (view === "EnergyUseIntensity") v = d.sqft > 0 ? d.cons / d.sqft : 0;

            return {
                name: n,
                value: Number(v.toFixed(2))
            };

        }).sort((a, b) => b.value - a.value);


        let xlabel = "Equivalent Energy (" + uom + ")";

        if (view === "AggregatedUnitCost")
            xlabel = "Total Charges ($)";

        if (view === "EnergyUseIntensity")
            xlabel = "EUI (" + uom + "/sqft)";


        return {

            backgroundColor: "#1E293B",

            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "shadow"
                },
                backgroundColor: "#0F172A",
                textStyle: {
                    color: "#E2E8F0"
                }
            },

            grid: {
                left: "15%",
                right:  "10%",
                top:  "5%",
                bottom: "10%"
            },

            xAxis: {
                type: "value",
                name: xlabel,
                nameLocation: "middle",
                nameGap: 40,

                nameTextStyle: {
                    color: "#CBD5F5"
                },

                axisLabel: {
                    color: "#CBD5E1",
                    formatter: v => v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "K" : v
                },

                axisLine: {
                    lineStyle: {
                        color: "#475569"
                    }
                },

                splitLine: {
                    lineStyle: {
                        color: "#334155"
                    }
                }
            },

            yAxis: {
                type: "category",
                inverse: true,
                data: rows.map(r => r.name),

                axisLabel: {
                    color: "#E2E8F0",
                    width: 110,
                    overflow: "truncate"
                },

                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                }
            },

            series: [{
                type: "bar",
                barWidth: 18,

                itemStyle: {
                    color: "#3B82F6",
                    borderRadius: [0, 4, 4, 0]
                },

                data: rows.map(r => r.value)

            }]

        };

    },

    getMeterChartConfig() {

        const raw = fetch_analytics_data.data || [];
        const view = this.getActiveView();
        const uom = this.getUOMLabel();
        const u = appsmith.store.ecUOM || "BTU";

        const map = {};

        raw.forEach(r => {

            const k = (r.location_description || "") + " " + (r.location_id || "");

            if (!map[k])
                map[k] = {
                    cons: 0,
                    charges: 0,
                    sqft: Number(r.square_feet) || 0
                };

            const f = this.getBTUConversionFactor(r.utility_type, u);

            map[k].cons += ((Number(r.consumption) || 0) * f) / 1000000;
            map[k].charges += Number(r.total_charges) || 0;

        });


        const rows = Object.entries(map).map(([n, d]) => {

            let v = d.cons;

            if (view === "AggregatedUnitCost") v = d.charges;
            if (view === "EnergyUseIntensity") v = d.sqft > 0 ? d.cons / d.sqft : 0;

            return {
                name: n.length > 40 ? n.substring(0, 37) + "..." : n,
                value: Number(v.toFixed(2))
            };

        }).sort((a, b) => b.value - a.value).slice(0, 8);


        let xlabel = "Equivalent Energy (" + uom + ")";

        if (view === "AggregatedUnitCost")
            xlabel = "Total Charges ($)";

        if (view === "EnergyUseIntensity")
            xlabel = "EUI (" + uom + "/sqft)";


        return {

            backgroundColor: "#1E293B",

            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "shadow"
                },
                backgroundColor: "#0F172A",
                textStyle: {
                    color: "#E2E8F0"
                }
            },

            grid: {
                left: "25%",
                right: "5%",
                top: "5%",
                bottom: "10%"
            },

            xAxis: {
                type: "value",
                name: xlabel,
                nameLocation: "middle",
                nameGap: 40,

                nameTextStyle: {
                    color: "#CBD5F5"
                },

                axisLabel: {
                    color: "#CBD5E1",
                    formatter: v => v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "K" : v
                },

                axisLine: {
                    lineStyle: {
                        color: "#475569"
                    }
                },

                splitLine: {
                    lineStyle: {
                        color: "#334155"
                    }
                }
            },

            yAxis: {
                type: "category",
                inverse: true,
                data: rows.map(r => r.name),

                axisLabel: {
                    color: "#E2E8F0",
                    width: 190,
                    overflow: "truncate"
                },

                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                }
            },

            series: [{
                type: "bar",
                barWidth: 18,

                itemStyle: {
                    color: "#3B82F6",
                    borderRadius: [0, 4, 4, 0]
                },

                data: rows.map(r => r.value)

            }]

        };

    },

    getUtilityPieConfig() {

        const raw = fetch_analytics_data.data || [];
        const u = appsmith.store.ecUOM || "BTU";

        const map = {};

        raw.forEach(r => {

            const t = r.utility_type || "Unknown";

            if (!map[t]) map[t] = 0;

            const f = this.getBTUConversionFactor(t, u);

            map[t] += ((Number(r.consumption) || 0) * f) / 1000000;

        });


        const rows = Object.entries(map).map(([n, v]) => ({
            name: n,
            value: Number(v.toFixed(2))
        }));


        const colors = {
            NATURALGAS: "#22C55E",
            ELECTRIC: "#3B82F6",
            OIL2: "#065F46",
            STEAM: "#F59E0B",
            WATER: "#06B6D4"
        };


        return {

            backgroundColor: "#1E293B",

            tooltip: {
                trigger: "item",
                backgroundColor: "#0F172A",
                textStyle: {
                    color: "#E2E8F0"
                }
            },

            legend: {
								top: "3%",
								left: "center",
								textStyle: {
										color: "#E2E8F0"
								}
						},

            series: [{

                type: "pie",
                radius: ["50%", "70%"],
                center: ["50%", "50%"],
                label: {
                    color: "#E2E8F0",
                    formatter: p => p.value.toFixed(2) + "M (" + p.percent.toFixed(1) + "%)"
                },

                labelLine: {
                    lineStyle: {
                        color: "#64748B"
                    }
                },
                data: rows,
                color: rows.map(r => colors[r.name] || "#94A3B8")
            }]

        };

    },

    setDefaults() {

        if (!appsmith.store.ecActiveView)
            storeValue("ecActiveView", "AggregatedConsumption");

        if (!appsmith.store.ecUOM)
            storeValue("ecUOM", "BTU");

    }

};