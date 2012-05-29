const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Signals = imports.signals;
const Mainloop = imports.mainloop;
const ContactDisplay = imports.ui.contactDisplay;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const MockShellApp = Extension.imports.libs.MockShellApp;

const Contacts = (function() {
	let instance;

	let ContactsInstance = new Lang.Class({
		Name: "Contacts",

		_init: function() {
			this.uuid = Math.random();
			this.contactSystem = Shell.ContactSystem.get_default();

			// TODO add url where a gnome dev says to add a delay
			// give the contacts some time to be loaded
			let initTimeout = Mainloop.timeout_add(3000, Lang.bind(this, function() {
				this.setCategories();
				this.setApps();

				this.emit("ready");

				Mainloop.source_remove(initTimeout);
			}));
		},

		getApps: function() {
			// return all the apps
			return this.categories[0].apps;
		},

		getCategories: function() {
			return this.categories;
		},

		setCategories: function() {
			this.categories = [{name: "All", apps: []}];
			for (let i = 0; i < 26; i++) {
				this.categories.push({name: String.fromCharCode(65 + i), apps: []});
			}
		},

		setApps: function() {
			this.contacts = this.contactSystem.initial_search([""]); // get_all() doesnt return anything

			for (let i = 0; i < this.contacts.length; i++) {
				let contact = this.contactSystem.get_individual(this.contacts[i]);

				if (contact.full_name && !contact.is_user) {
					let mockShellApp = new MockShellApp.MockShellApp(contact.id
						, contact.full_name
						, function(size) {
							let tc = St.TextureCache.get_default();

							if (contact.avatar != null) {
								return tc.load_gicon(null, contact.avatar, size);
							} else {
								return tc.load_icon_name(null, "avatar-default", St.IconType.FULLCOLOR, size);
							}
						}
						, function(){
							ContactDisplay.launchContact(contact.id);
						}
					);

					mockShellApp.contact = contact;

					let firstChar = contact.full_name[0].toUpperCase();
					this.categories[(String.charCodeAt(firstChar) - 65) + 1].apps.push(mockShellApp);
				}
			}

			// remove empty categories
			for (let i = this.categories.length - 1; i !== 0; i--) {
				if (this.categories[i].apps.length === 0) {
					this.categories.splice(i, 1);
				}
			}

			// insert all the apps into the All category
			for (let i = 0; i < this.categories.length; i++) {
				this.categories[0].apps.push.apply(this.categories[0].apps, this.categories[i].apps);
			}

			this.categories[0].apps.sort(function(a, b) {
				if (a.get_name().toLowerCase() === b.get_name().toLowerCase()) {
					return 0;
				}

				return a.get_name().toLowerCase() < b.get_name().toLowerCase() ? -1 : 1;
			});
		},

		destroy: function() {
			instance = null;
		}
	});
	Signals.addSignalMethods(ContactsInstance.prototype);

	return new function() {
		this.getInstance = function() {
			if (!instance) {
				instance = new ContactsInstance();
			}

			return instance;
		}
	}
})();