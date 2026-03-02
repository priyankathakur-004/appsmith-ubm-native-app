export default {
	getViewBy() {
		return appsmith.store.psfViewBy || 'ChargesPerSqft';
	},

	getChartType() {
		return appsmith.store.psfChartType || 'bar';
	},

	getChartTitle() {
		var view = this.getViewBy();
		var titles = {
			'ChargesPerSqft': 'Charges per Square Feet ($/sqft)',
			'ConsPerSqft': 'Consumption per Square Feet (unit/sqft)',
			'EUI': 'Energy Use Intensity (kBTU/sqft)'
		};
		return titles[view] || titles['ChargesPerSqft'];
	},

	getLocationOptions() {
		var raw = fetch_analytics_data.data || [];
		var locs = new Set();
		raw.forEach(function(r) {
			var loc = r.location_description || 'Unknown';
			locs.add(loc);
		});
		return Array.from(locs).sort().map(function(loc) {
			return { label: loc, value: loc };
		});
	},

	getSelectedLocations() {
		var widget = appsmith.widgets.PSFLocCheckbox;
		if (widget && widget.selectedValues && widget.selectedValues.length > 0) {
			return widget.selectedValues;
		}
		return this.getLocationOptions().map(function(o) { return o.value; });
	},

	getPerSqftData() {
		var raw = fetch_analytics_data.data || [];
		var selectedLocs = this.getSelectedLocations();
		var view = this.getViewBy();
		var byLocYear = {};

		raw.forEach(function(r) {
			var loc = r.location_description || 'Unknown';
			if (!selectedLocs.includes(loc)) return;

			var sqft = parseFloat(r.square_feet) || 0;
			if (sqft <= 0) return;

			var date = r.time_period || r.bill_start_date || '';
			var year = date.substring(0, 4);
			if (!year) return;

			if (!byLocYear[loc]) byLocYear[loc] = {};
			if (!byLocYear[loc][year]) byLocYear[loc][year] = { charges: 0, consumption: 0, sqft: sqft };

			byLocYear[loc][year].charges += parseFloat(r.total_charges) || 0;
			byLocYear[loc][year].consumption += parseFloat(r.consumption) || 0;
		});

		return byLocYear;
	},

	getValue(d, view) {
		if (view === 'ConsPerSqft') return d.sqft > 0 ? d.consumption / d.sqft : 0;
		if (view === 'EUI') return d.sqft > 0 ? (d.charges / d.sqft) * 3.412 : 0;
		return d.sqft > 0 ? d.charges / d.sqft : 0;
	},

	getChartConfig() {

	var byLocYear = this.getPerSqftData();
	var view = this.getViewBy();
	var chartType = this.getChartType();
	var self = this;

	var allYears = new Set();

	Object.values(byLocYear).forEach(function(years){
		Object.keys(years).forEach(function(y){
			allYears.add(y);
		});
	});

	var sortedYears = Array.from(allYears)
		.sort()
		.reverse()
		.slice(0,5);

	var locations = Object.keys(byLocYear);


	/* Sort by totals */

	var locTotals = {};

	locations.forEach(function(loc){

		var total = 0;

		sortedYears.forEach(function(year){

			var d = (byLocYear[loc] || {})[year];

			if(d)
				total += self.getValue(d,view);

		});

		locTotals[loc] = total;

	});


	locations.sort(function(a,b){
		return locTotals[b] - locTotals[a];
	});



	/* Dark Colors */

	var yearColors = [
		'#86efac',
		'#60a5fa',
		'#fbbf24',
		'#c084fc',
		'#fb7185'
	];



	/* BAR SERIES */

	var barSeries = sortedYears.map(function(year,idx){

		return {

			name:year,

			type:'bar',

			barWidth:28,   // Bigger bars


			data:locations.map(function(loc){

				var d=(byLocYear[loc]||{})[year];

				return d
					? Number(self.getValue(d,view).toFixed(2))
					: 0;

			}),


			label:{

				show:true,

				position:'right',

				color:'#ffffff',

				fontSize:14,   // Bigger text

				fontWeight:'bold',

				formatter:function(p){

					if(!p.value) return '';

					return p.value.toLocaleString();

				}

			},


			itemStyle:{

				color:yearColors[idx % yearColors.length],

				borderRadius:[0,6,6,0]

			}

		};

	});



	var xFormatter;

	if(view === 'ChargesPerSqft'){

		xFormatter = function(v){

			return '$'+v;

		};

	}
	else{

		xFormatter = function(v){

			return v >= 1000000
				? (v/1000000).toFixed(1)+'M'
				: v >= 1000
				? (v/1000).toFixed(0)+'K'
				: v;

		};

	}



	return {

		backgroundColor:'#1E293B',


		tooltip:{
			trigger:'axis',
			axisPointer:{type:'shadow'},
			backgroundColor:'#0f172a',
			textStyle:{color:'#fff'}
		},


		legend:{

			top:5,

			right:10,

			textStyle:{
				color:'#fff',
				fontSize:14   // Bigger legend
			}

		},



		grid:{

			left:180,  // More space for location names
			right:60,

			top:50,

			bottom:40

		},



		xAxis:{

			type:'value',

			axisLabel:{
				color:'#cbd5e1',
				fontSize:13,
				formatter:xFormatter
			},

			splitLine:{
				lineStyle:{
					color:'#334155'
				}
			},

			axisLine:{
				lineStyle:{
					color:'#64748b'
				}
			}

		},



		yAxis:{

			type:'category',

			data:locations,

			inverse:true,


			axisLabel:{

				color:'#ffffff',

				fontSize:14,  // Bigger labels

				width:160,

				overflow:'truncate'

			},


			axisLine:{
				lineStyle:{
					color:'#64748b'
				}
			}

		},


		series:barSeries

	};

},


	setDefaults() {
		if (!appsmith.store.psfViewBy) storeValue('psfViewBy', 'ChargesPerSqft');
		if (!appsmith.store.psfChartType) storeValue('psfChartType', 'bar');
	}
}