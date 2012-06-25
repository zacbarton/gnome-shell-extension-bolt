const St = imports.gi.St;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Contacts = Extension.imports.data.Contacts;
const CategoryViewFiltered = Extension.imports.widgets.CategoryViewFiltered;

const ContactsView = new Lang.Class({
	Name: "ContactsView",
	Extends: CategoryViewFiltered.CategoryViewFiltered,

	_init: function(bolt) {
		this.parent("Contacts");

		this.bolt = bolt;
		this.dataProvider = Contacts.Contacts.getInstance();

		this.dataProvider.connect("ready", Lang.bind(this, function() {
			this.render();

			if (this.categories[0].apps.length === 0) {
				this.subTabs.hide();
				this.appIconGrid.actor.hide();

				this.notice = new St.BoxLayout({style_class: "notice"
					, vertical: true
					, visible: true
					, reactive: false
				});
				this.notice.add_constraint(new Clutter.BindConstraint({source: this.panel, coordinate: Clutter.BindCoordinate.ALL}));
				this.panel.add_actor(this.notice);

					this.button = new St.Button({label: "Click here to add some contacts.", style: "text-align: center;"}); // FIXME make me look better
					this.button.connect("clicked", Lang.bind(this, function() {
						let appSytem = Shell.AppSystem.get_default();
						let contacts = appSytem.lookup_setting("gnome-contacts.desktop") || appSytem.lookup_setting("gnome-online-accounts-panel.desktop");

						contacts.activate();
						this.bolt.hide();
					}));
					this.notice.add(this.button, {x_align: St.Align.MIDDLE, x_fill: false, y_align: St.Align.MIDDLE, y_fill: false, expand: true});
			} else {
				// hide All and show the next category, probably A
				// all is actually required so that the data/categories are in the same format as other CategoryViewFiltered views
				let all = this.subTabs.get_first_child();
				this.selectCategory(all.get_next_sibling());
				all.hide();
			}
		}));
	}
});