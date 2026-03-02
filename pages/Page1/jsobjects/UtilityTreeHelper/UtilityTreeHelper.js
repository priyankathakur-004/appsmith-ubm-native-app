export default {
	getViewBy() {
		return appsmith.store.utViewBy || 'Consumption';
	},

	getChartTitle() {
		const viewBy = this.getViewBy();
		const raw = fetch_analytics_data.data || [];
		const units = new Set();
		raw.forEach(r => { if (r.total_consumption_uom) units.add(r.total_consumption_uom); });
		const uom = units.size === 1 ? Array.from(units)[0] : '';
		if (viewBy === 'Charges') return 'Charges ($)';
		return uom ? 'Consumption (' + uom + ')' : 'Consumption';
	},

	buildTreeData() {
		const raw = fetch_analytics_data.data || [];
		const viewBy = this.getViewBy();
		const isCharges = viewBy === 'Charges';

		const root = { name: viewBy, value: 0, children: [] };
		const level1 = {};

		raw.forEach(r => {
			const ut = r.utility_type || 'Unknown';
			const bt = r.bill_type || 'Unknown';
			const loc = r.location_description || 'Unknown';
			const val = isCharges ? (parseFloat(r.total_charges) || 0) : (parseFloat(r.consumption) || 0);

			root.value += val;

			if (!level1[ut]) level1[ut] = { name: ut, value: 0, _children: {} };
			level1[ut].value += val;

			var btKey = bt;
			if (!level1[ut]._children[btKey]) level1[ut]._children[btKey] = { name: bt, value: 0, _children: {} };
			level1[ut]._children[btKey].value += val;

			if (!level1[ut]._children[btKey]._children[loc]) level1[ut]._children[btKey]._children[loc] = { name: loc, value: 0 };
			level1[ut]._children[btKey]._children[loc].value += val;
		});

		root.children = Object.values(level1)
			.map(function(l1) {
				return {
					name: l1.name,
					value: Math.round(l1.value),
					children: Object.values(l1._children)
						.map(function(l2) {
							return {
								name: l2.name,
								value: Math.round(l2.value),
								children: Object.values(l2._children)
									.map(function(l3) {
										return { name: l3.name, value: Math.round(l3.value) };
									})
									.sort(function(a, b) { return b.value - a.value; })
							};
						})
						.sort(function(a, b) { return b.value - a.value; })
				};
			})
			.sort(function(a, b) { return b.value - a.value; });

		root.value = Math.round(root.value);
		return root;
	},

	formatValue(v) {
		if (v >= 1000000000) return (v / 1000000000).toFixed(1) + 'B';
		if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
		if (v >= 1000) return Math.round(v / 1000) + 'K';
		return v.toLocaleString();
	},

	getTreeChartConfig() {
		var treeData = this.buildTreeData();
		var self = this;

		return {
			backgroundColor: 'transparent',
			tooltip: {
				trigger: 'item',
				backgroundColor: '#1e293b',
				borderColor: '#334155',
				textStyle: { color: '#e2e8f0', fontSize: 13 },
				formatter: function(params) {
					var d = params.data;
					var name = d.name || '';
					var val = (d.value || 0).toLocaleString();
					return '<b>' + name + '</b><br/>' + val;
				}
			},
			series: [{
				type: 'tree',
				data: [treeData],
				orient: 'LR',
				top: 30,
				bottom: 30,
				left: 80,
				right: 180,
				edgeShape: 'polyline',
				edgeForkPosition: '60%',
				symbol: 'roundRect',
				symbolSize: function(value, params) {
					var v = params.data.value || 0;
					if (v >= 10000000) return [150, 26];
					if (v >= 1000000) return [120, 24];
					if (v >= 100000) return [100, 22];
					if (v >= 10000) return [80, 20];
					return [60, 18];
				},
				initialTreeDepth: 3,
				expandAndCollapse: true,
				animationDuration: 550,
				animationDurationUpdate: 750,
				roam: true,
				lineStyle: {
					color: '#475569',
					width: 1.5,
					curveness: 0.5
				},
				itemStyle: {
					color: '#1e3a5f',
					borderColor: '#3B82F6',
					borderWidth: 1.5
				},
				emphasis: {
					focus: 'descendant',
					itemStyle: {
						color: '#2563eb',
						borderColor: '#60a5fa',
						borderWidth: 2
					}
				},
				label: {
					position: 'inside',
					verticalAlign: 'middle',
					align: 'center',
					fontSize: 11,
					color: '#f1f5f9',
					formatter: function(params) {
						var d = params.data;
						var v = d.value || 0;
						var fmt;
						if (v >= 1000000000) fmt = (v / 1000000000).toFixed(1) + 'B';
						else if (v >= 1000000) fmt = (v / 1000000).toFixed(1) + 'M';
						else if (v >= 1000) fmt = Math.round(v / 1000) + 'K';
						else fmt = v.toString();
						return d.name + '\n' + fmt;
					},
					rich: {
						name: { fontSize: 11, color: '#f1f5f9', fontWeight: 'bold' },
						val: { fontSize: 10, color: '#cbd5e1' }
					}
				},
				leaves: {
					label: {
						position: 'right',
						verticalAlign: 'middle',
						align: 'left',
						color: '#e2e8f0',
						fontSize: 11,
						formatter: function(params) {
							var d = params.data;
							var v = d.value || 0;
							var fmt;
							if (v >= 1000000000) fmt = (v / 1000000000).toFixed(1) + 'B';
							else if (v >= 1000000) fmt = (v / 1000000).toFixed(1) + 'M';
							else if (v >= 1000) fmt = Math.round(v / 1000) + 'K';
							else fmt = v.toString();
							return d.name + '\n' + fmt;
						}
					}
				}
			}]
		};
	},

	setDefaults() {
		if (!appsmith.store.utViewBy) storeValue('utViewBy', 'Consumption');
	}
}