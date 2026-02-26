export default {
    getActiveView() {
        return appsmith.store.activeView || 'Charges';
    },

    getChartTitle() {
        const view = this.getActiveView();
        const titles = {
            'Charges': 'Charges ($)',
            'Consumption': 'Consumption (KWH, CCF, MIN, THERM, MB, SQFEET, GEL)',
            'Unit Cost': 'Unit Cost ($/unit)',
            'Demand': 'Demand (kW)',
            'Load Factor': 'Load Factor (%)'
        };
        return titles[view] || 'Charges ($)';
    },

    getInfoText() {
        const view = this.getActiveView();
        const texts = {
            'Charges': '\u24D8 Charges are additive across multiple utility types and bill types.',
            'Consumption': '\u24D8 Please select the Bill Type. as Full Service/Distribution Only to avoid double counting the Consumption',
            'Unit Cost': '\u24D8 Unit cost is not additive across multiple utilities. <b>Choose one utlity</b> in the Utility filter above.',
            'Demand': '\u24D8 To ensure correct results, Choose only <b> Electric </b> as utility type n the Utility filter above.',
            'Load Factor': '\u24D8 To ensure correct results, Choose only <b> Electric </b> as utility type n the Utility filter above.'
        };
        return texts[view] || '';
    },
 
		getChartConfig() {
			const view = this.getActiveView();
			const data = Array.isArray(fetch_analytics_data.data) ? fetch_analytics_data.data : [];
			const demandData = Array.isArray(fetch_demand_loadfactor.data) ? fetch_demand_loadfactor.data : [];

			const map = {};

			data.forEach(r => {
				const loc = r.location_description || "Unknown";
				map[loc] = map[loc] || {
					charges: 0,
					consumption: 0,
					demand: 0,
					loadFactor: 0
				};

				map[loc].charges += Number(r.total_charges) || 0;
				map[loc].consumption += Number(r.consumption) || 0;
			});


			if (view === "Demand" || view === "Load Factor") {

				demandData.forEach(r => {
					const loc = r.location_description || "Unknown";
					map[loc] = map[loc] || {
						charges: 0,
						consumption: 0,
						demand: 0,
						loadFactor: 0
					};

					map[loc].demand += Number(r.demand) || 0;

					if (Number(r.load_factor) > 0) {
						map[loc].loadFactor = Number(r.load_factor);
					}
				});

			}

			Object.values(map).forEach(d => {
				d.unitCost = d.consumption
					? d.charges / d.consumption
					: 0;
			});

			const key = {
				Charges: "charges",
				Consumption: "consumption",
				"Unit Cost": "unitCost",
				Demand: "demand",
				"Load Factor": "loadFactor"
			}[view] || "charges";

			const sorted = Object.entries(map)
				.sort((a, b) =>
					(b[1][key] || 0) - (a[1][key] || 0)
				);

			return {
				tooltip: {
					trigger: "axis",
					axisPointer: {
						type: "shadow"
					},
					formatter: "{b}<br/>{c}"
				},

				xAxis: {
					type: "value"
				},

				yAxis: {
					type: "category",
					data: sorted.map(x => x[0]),
					inverse: true
				},

				series: [
					{
						type: "bar",
						name: view,
						data: sorted.map(x => x[1][key] || 0)
					}
				]
			};
	},
	
		getTableData() {
				const view = this.getActiveView();
				const data = Array.isArray(fetch_analytics_data.data)? fetch_analytics_data.data: [];
				const demandData = Array.isArray(fetch_demand_loadfactor.data)? fetch_demand_loadfactor.data: [];

				const map = {};

				data.forEach(r => {
					const loc = r.location_description || "Unknown";

					map[loc] = map[loc] || {
						location: loc,
						charges: 0,
						consumption: 0,
						demand: 0,
						loadFactor: 0
					};

					map[loc].charges += Number(r.total_charges) || 0;
					map[loc].consumption += Number(r.consumption) || 0;

				});


				if (view === "Demand" || view === "Load Factor") {
					demandData.forEach(r => {
						const loc = r.location_description || "Unknown";
						map[loc] = map[loc] || {
							location: loc,
							charges: 0,
							consumption: 0,
							demand: 0,
							loadFactor: 0
						};

						map[loc].demand += Number(r.demand) || 0;
						if (Number(r.load_factor) > 0) {
							map[loc].loadFactor = Number(r.load_factor);
						}

					});

				}

				Object.values(map).forEach(d => {

					d.unitCost = d.consumption
						? d.charges / d.consumption
						: 0;

				});


				return Object.values(map)
					.sort((a,b)=>b[viewKey(view)]-a[viewKey(view)]);


				function viewKey(v){

					return {
						Charges: "charges",
						Consumption: "consumption",
						"Unit Cost": "unitCost",
						Demand: "demand",
						"Load Factor": "loadFactor"
					}[v] || "charges";

				}

			}

}