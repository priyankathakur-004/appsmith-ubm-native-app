export default {
    setView(viewName) {
        storeValue('activeView', viewName);
    },

    async applyFilters() {
        await fetch_analytics_data.run();
        await fetch_demand_loadfactor.run();
    },

    printView() {
        window.print();
    },

    async saveView() {
        const state = {
            dates: DateSelect.selectedOptionValues,
            utilityType: UtilityTypeSelect.selectedOptionValue,
            billType: BillTypeSelect.selectedOptionValue,
            locationAttr: LocationAttrSelect.selectedOptionValue,
            attrChoice: AttrChoiceSelect.selectedOptionValue,
            location: LocationSelect.selectedOptionValue,
            view: appsmith.store.activeView || 'Charges'
        };
        storeValue('savedAnalyticsView', JSON.stringify(state));
        showAlert('View saved successfully', 'success');
    },

    async loadSavedView() {
        const saved = appsmith.store.savedAnalyticsView;
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.view) storeValue('activeView', state.view);
                showAlert('Saved view loaded', 'success');
            } catch(e) {
                showAlert('No saved view found', 'warning');
            }
        } else {
            showAlert('No saved view found', 'warning');
        }
    },

    async onLocationAttrChange() {
        await fetch_attribute_values.run();
    }
}