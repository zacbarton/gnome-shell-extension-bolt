const Lang = imports.lang;
const GMenu = imports.gi.GMenu;
const Shell = imports.gi.Shell;

const GMenuReader = new Lang.Class({
	Name: "GMenuReader",

	_init: function(lookupType) {
		this.appSystem = Shell.AppSystem.get_default();
		this.lookupType = lookupType === "apps" ? "lookup_app" : "lookup_setting";
	},

	getCategories: function(tree) {
		let categories = [];
		let root = tree.get_root_directory();
		let iter = root.iter();

		let nextType;
		while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
			if (nextType == GMenu.TreeItemType.DIRECTORY) {
				let dir = iter.get_directory();

				if (dir.get_is_nodisplay()) {
					continue;
				}

				let apps = [];
				this.loadCategory(dir, apps);
				categories.push({name: dir.get_name(), apps: apps});
			}
		}

		return categories;
	},

	loadCategory: function(dir, apps) {
		let iter = dir.iter();

		let nextType;
		while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
			if (nextType == GMenu.TreeItemType.ENTRY) {
				let entry = iter.get_entry();

				if (!entry.get_app_info().get_nodisplay()) {
					let app = this.appSystem[this.lookupType](entry.get_desktop_file_id());
					apps.push(app);
				}
			} else if (nextType == GMenu.TreeItemType.DIRECTORY) {
				if (!dir.get_is_nodisplay()) {
					this.loadCategory(iter.get_directory(), apps);
				}
			}
		}
	}
});