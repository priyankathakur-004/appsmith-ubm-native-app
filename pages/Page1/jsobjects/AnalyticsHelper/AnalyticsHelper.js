export default {
		getTableData() {
				let data = [];

				if (Tabs.selectedTab === 'Rank of Locations')
						data = LocationHelper.getTableData();

				if (Tabs.selectedTab === 'Weather Sensitivity') {
						if (appsmith.store.chartName === 'Time Series')
								data = WeatherHelper.getTimeSeriesTable();

						if (appsmith.store.chartName === 'Correlation')
								data = WeatherHelper.getCorrelationTable();

						if (appsmith.store.chartName === 'Scatter')
								data = WeatherHelper.getScatterTable();
				}

				/* Auto format numbers */
				return data.map(row => {
						const r = {};

						Object.keys(row).forEach(k => {
								const v = row[k];
								r[k] = typeof v === "number" ? Number(v.toFixed(2)) : v;
						});

						return r;
				});

		},
	
		exportCSV() {
				const data = this.getTableData();

				if (!data.length) {
						showAlert("No data to export", "warning");
						return;
				}

				const headers = Object.keys(data[0]);
				const csv = headers.join(",") + "\n" + data.map(r => headers.map(h => r[h]).join(",")).join("\n");
				download(csv, "analytics.csv", "application/csv");

		},

		clear() {
			removeValue('chartName');
		},
	
		setDefaults() {
		EnergyConsumptionHelper.setDefaults();
			if (Tabs.selectedTab === 'Weather Sensitivity') { 
				 UtilityTypeSelect.setSelectedOption("ELECTRIC");
			}
		}
}