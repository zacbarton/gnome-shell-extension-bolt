const St = imports.gi.St;
const Lang = imports.lang;
const Pango = imports.gi.Pango;
const Clutter = imports.gi.Clutter;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Utils = Extension.imports.libs.Utils;
const CategoryView = Extension.imports.widgets.CategoryView;

const CategoryViewFiltered = new Lang.Class({
	Name: "CategoryViewFiltered",
	Extends: CategoryView.CategoryView,

	_init: function(tabLabel) {
		this.parent(tabLabel);
	},

	render: function() {
		// store
		this.categories = this.dataProvider.getCategories();
		this.apps = this.dataProvider.getApps();

		// reset
		this.subTabs.destroy_all_children();
		this.appIconGrid.removeAll();

		for (let i = 0; i < this.categories.length; i++) {
			let tab = new St.Bin({style_class: "category"
				, x_fill: true
				, reactive: true
				, can_focus: true
				, track_hover: true
				, child: new St.Label({text: this.categories[i].name})
			});
			tab.get_child().clutter_text.set_ellipsize(Pango.EllipsizeMode.MIDDLE);
			Utils.addExtraCssSupport(tab);

			// the first item is always selected
			if (i === 0) {
				tab.add_style_pseudo_class("selected");
			}

			this.subTabs.add_actor(tab);
		}

		// add apps
		this.renderApps(this.appIconGrid, this.apps);

		this.hasData = this.categories[0].apps.length !== 0;
	},

	getSelectedSubTabIndex: function() {
		let i, subTabs;
		for (i = 0, subTabs = this.subTabs.get_children(); i < subTabs.length; i++) {
			if (subTabs[i].visible && subTabs[i].has_style_pseudo_class("selected")) {
				return i;
			}
		}

		return -1;
	},

	getSelectedSubTab: function() {
		return this.subTabs.get_children()[this.getSelectedSubTabIndex()];
	},

	selectCategory: function(subTab) {
		// check this tab isnt already selected
		if (subTab.has_style_pseudo_class("selected")) return;

		// find the selected tab
		let i, subTabs, subTabIndex, id, categoryAppsLength;

		for (i = 0, subTabs = this.subTabs.get_children(); i < subTabs.length; i++) {
			subTabs[i].remove_style_pseudo_class("selected");

			if (subTabs[i] === subTab) {
				subTabIndex = i;
			}
		}

		subTabs[subTabIndex].add_style_pseudo_class("selected");
		subTabs[subTabIndex].grab_key_focus();

		let categoryApps = this.categories[subTabIndex].apps;
		this.setAppsVisible(categoryApps);
	},

	setAppsVisible: function(apps) {
		if (!apps) {
			return;
		}

		// hide all of the app icons
		for (let id in this.iconCache) {
			this.iconCache[id].actor.visible = false;
		}

		// add apps
		for (let i = 0, count = apps.length; i < count; i++) {
			this.iconCache[apps[i].get_id()].actor.visible = true;
		}
	},

	destroy: function() {
		for (let id in this.iconCache) {
			this.iconCache[id].destroy();
		}
		this.iconCache = {};

		if (this.dataProviderConnection) {
			this.dataProvider.disconnect(this.dataProviderConnection);
		}

		this.dataProvider.destroy();
		this.appIconGrid.removeAll();

		this.tab.destroy();
		this.panel.destroy();
	}
});