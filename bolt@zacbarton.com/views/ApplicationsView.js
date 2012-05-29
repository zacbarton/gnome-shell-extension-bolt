const Lang = imports.lang;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Applications = Extension.imports.data.Applications;
const CategoryViewFiltered = Extension.imports.widgets.CategoryViewFiltered;

const ApplicationsView = new Lang.Class({
	Name: "ApplicationsView",
	Extends: CategoryViewFiltered.CategoryViewFiltered,

	_init: function(bolt) {
		this.parent("Applications");

		this.bolt = bolt;
		this.dataProvider = Applications.Applications.getInstance();

		this.render();

		this.dataProviderConnection = this.dataProvider.connect("updated", Lang.bind(this, function() {
			this.render();
		}));
	}
});